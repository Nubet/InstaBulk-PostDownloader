import { sendMessage } from 'webext-bridge/content-script'
import { buildDownloadBatch } from '../application/buildDownloadBatch'
import { startDownloadSession } from '../application/startDownloadSession'
import { extensionMessage } from '../contracts/messages'
import {
  getRandomDelay,
  hasReachedProfileEnd,
  profileScrapePolicy,
  shouldApplyBatchCooldown,
} from '../domain/scrapePolicy'
import type { DownloadSession, ScrapedPost } from '../domain/profileDownload'
import { extractProfilePostsFromDocument } from '../infrastructure/extractProfilePostsFromDocument'
import { fetchInstagramPostCaption } from '../infrastructure/fetchInstagramPostCaption'
import {
  createIdleProgress,
  createScrapeDebugEntry,
  getCompletedScrapeProgress,
  getFailedScrapeProgress,
  getSavedProgress,
  getSavingProgress,
  getScrapeLoopProgress,
  getStoppedScrapeProgress,
} from '../presentation/scrapeState'
import type { ScrapeDebugEntry, ScrapeProgress } from '../presentation/scrapeState'
import type {
  GetScrapeStatusResponse,
  QueueDownloadBatchResponse,
  StartProfileDownloadRequest,
  StartProfileDownloadResponse,
  StopProfileDownloadRequest,
  StopProfileDownloadResponse,
} from '../contracts/messages'

export interface ProfileDownloadRuntime {
  getScrapeStatus: () => GetScrapeStatusResponse
  startProfileDownload: (request: StartProfileDownloadRequest) => Promise<StartProfileDownloadResponse>
  stopProfileDownload: (request: StopProfileDownloadRequest) => StopProfileDownloadResponse
}

export function createProfileDownloadRuntime(): ProfileDownloadRuntime {
  let activeSession: DownloadSession | null = null
  let progress: ScrapeProgress = createIdleProgress('Open a public Instagram profile first.')
  let scrapedPosts: ScrapedPost[] = []
  let seenPostIds = new Set<string>()
  let isStopRequested = false
  let lastCooldownPostCount = 0
  let activeRunId = 0
  let debugLog: ScrapeDebugEntry[] = []

  function getScrapeStatus(): GetScrapeStatusResponse {
    return { progress, debugLog }
  }

  async function startProfileDownload(request: StartProfileDownloadRequest): Promise<StartProfileDownloadResponse> {
    const response = startDownloadSession(activeSession, progress, request.profileUrl)

    activeSession = response.session
    progress = response.progress

    if (!response.accepted || !activeSession) {
      if (!response.accepted)
        addDebugLog('warn', 'session', 'Rejected start request because another session is already active.')

      return { ...response, debugLog }
    }

    activeRunId += 1
    const runId = activeRunId
    isStopRequested = false
    seenPostIds = new Set()
    debugLog = []
    lastCooldownPostCount = 0
    scrapedPosts = []

    addDebugLog('info', 'session', `Started scrape session for @${activeSession.profile.name}.`, `url=${activeSession.profile.url}`)
    const foundInitialPosts = await scanVisiblePosts(activeSession, 'Initial DOM scan before scroll.')

    progress = getScrapeLoopProgress(
      activeSession,
      scrapedPosts.length,
      'scraping',
      foundInitialPosts
        ? `Found ${scrapedPosts.length} post${scrapedPosts.length === 1 ? '' : 's'}. Continuing scan.`
        : 'Scanning the profile grid.',
    )

    void runProfileScrape(activeSession, runId)

    return {
      ...response,
      debugLog,
      progress,
    }
  }

  function stopProfileDownload(request: StopProfileDownloadRequest): StopProfileDownloadResponse {
    const accepted = activeSession?.id === request.sessionId

    if (accepted)
      isStopRequested = true

    addDebugLog(
      accepted ? 'info' : 'warn',
      'session',
      accepted ? 'Stop requested for active session.' : 'Stop requested for a non-active session.',
      accepted ? `sessionId=${request.sessionId}` : undefined,
    )

    progress = accepted
      ? {
          ...progress,
          phase: 'stopped',
          message: 'Stopping download.',
        }
      : {
          ...progress,
          message: 'No matching session to stop.',
        }

    return {
      accepted,
      debugLog,
      progress,
    }
  }

  async function runProfileScrape(session: DownloadSession, runId: number) {
    let attemptsWithoutNewPosts = 0

    try {
      await waitForInitialProfileContent(session, runId)

      while (isCurrentRun(session.id, runId)) {
        if (isStopRequested)
          break

        if (hasReachedProfileEnd(attemptsWithoutNewPosts, profileScrapePolicy.maxAttemptsWithoutNewPosts)) {
          await saveScrapedPosts(session, runId)
          cleanupSession(session.id, runId)
          return
        }

        const scrollDelay = getRandomDelay(profileScrapePolicy.scrollDelayRange.min, profileScrapePolicy.scrollDelayRange.max)
        addDebugLog('info', 'session', 'Waiting before next scroll.', `delayMs=${scrollDelay}`)
        await wait(scrollDelay)

        if (!isCurrentRun(session.id, runId) || isStopRequested)
          break

        window.scrollTo({ top: document.documentElement.scrollHeight, behavior: 'smooth' })
        addDebugLog('info', 'session', 'Scrolled to the current bottom of the profile page.', `scrollHeight=${document.documentElement.scrollHeight}`)
        await wait(profileScrapePolicy.postScrollSettleDelayMs)

        if (!isCurrentRun(session.id, runId) || isStopRequested)
          break

        if (await scanVisiblePosts(session, `Post-scroll scan ${attemptsWithoutNewPosts + 1}.`)) {
          attemptsWithoutNewPosts = 0
          progress = getScrapeLoopProgress(session, scrapedPosts.length, 'scraping', `Found ${scrapedPosts.length} post${scrapedPosts.length === 1 ? '' : 's'}. Continuing scan.`)
        }
        else {
          if (!profileScrapePolicy.enableEndOfProfileRetries) {
            addDebugLog('info', 'session', 'No new posts found and end-of-profile retries are disabled. Saving current batch.')
            await saveScrapedPosts(session, runId)
            cleanupSession(session.id, runId)
            return
          }

          attemptsWithoutNewPosts += 1
          progress = getScrapeLoopProgress(session, scrapedPosts.length, 'scraping', `No new posts found. Retry ${attemptsWithoutNewPosts}/${profileScrapePolicy.maxAttemptsWithoutNewPosts}.`)
        }

        if (shouldApplyBatchCooldown(scrapedPosts.length, lastCooldownPostCount, profileScrapePolicy.cooldownBatchSize)) {
          lastCooldownPostCount = scrapedPosts.length
          const cooldownDelay = getRandomDelay(profileScrapePolicy.cooldownDelayRange.min, profileScrapePolicy.cooldownDelayRange.max)
          progress = getScrapeLoopProgress(session, scrapedPosts.length, 'cooldown', `Cooling down after ${scrapedPosts.length} posts.`)
          addDebugLog('info', 'session', 'Applying cooldown after batch threshold.', `delayMs=${cooldownDelay}, posts=${scrapedPosts.length}`)
          await wait(cooldownDelay)
        }
      }

      if (isStopRequested) {
        addDebugLog('info', 'session', 'Stopped session before save phase.')
        progress = getStoppedScrapeProgress(session, scrapedPosts.length)
        cleanupSession(session.id, runId)
        return
      }

      if (isCurrentRun(session.id, runId))
        await saveScrapedPosts(session, runId)

      cleanupSession(session.id, runId)
    }
    catch (error) {
      addDebugLog('error', 'session', 'Scrape session failed.', error instanceof Error ? error.message : 'Unknown scrape error.')
      progress = getFailedScrapeProgress(session, scrapedPosts.length, error instanceof Error ? error.message : 'Profile scraping failed.')
      cleanupSession(session.id, runId)
    }
  }

  async function saveScrapedPosts(session: DownloadSession, runId: number) {
    scrapedPosts = await enrichPostsWithAuthoredCaptions(scrapedPosts, session, runId)

    if (!isCurrentRun(session.id, runId))
      return

    const batch = buildDownloadBatch(session, scrapedPosts)
    progress = getSavingProgress(session, scrapedPosts.length, batch.items.length)
    addDebugLog('info', 'downloads', 'Queued scraped posts for saving.', `posts=${scrapedPosts.length}, files=${batch.items.length}`)

    const response = await sendMessage(
      extensionMessage.queueDownloadBatch,
      { batch } as unknown as never,
      { context: 'background' } as never,
    ) as unknown as QueueDownloadBatchResponse

    if (!isCurrentRun(session.id, runId))
      return

    if (response.failure)
      addDebugLog('warn', 'downloads', 'Download batch completed with a warning.', response.failure.message)
    else
      addDebugLog('info', 'downloads', 'Download batch finished successfully.', `downloadedFiles=${response.downloadedFileCount}`)

    progress = getSavedProgress(
      session,
      scrapedPosts.length,
      response.queuedItemCount,
      response.downloadedFileCount,
      response.failure?.message,
    )

    if (!response.failure && batch.items.length === 0)
      progress = getCompletedScrapeProgress(session, scrapedPosts.length)
  }

  async function enrichPostsWithAuthoredCaptions(posts: ScrapedPost[], session: DownloadSession, runId: number): Promise<ScrapedPost[]> {
    if (posts.length === 0)
      return posts

    addDebugLog('info', 'extractor', `Fetching authored captions for ${posts.length} post${posts.length === 1 ? '' : 's'}.`)

    const enrichedPosts: ScrapedPost[] = []

    for (const post of posts) {
      if (!isCurrentRun(session.id, runId) || isStopRequested)
        return posts

      try {
        const caption = await fetchInstagramPostCaption(post.id)
        enrichedPosts.push({ ...post, caption })
        addDebugLog(
          caption ? 'info' : 'warn',
          'extractor',
          caption ? `Caption fetched for ${post.id}.` : `No authored caption for ${post.id}.`,
        )
      }
      catch (error) {
        enrichedPosts.push({ ...post, caption: '' })
        addDebugLog('warn', 'extractor', `Caption fetch failed for ${post.id}.`, error instanceof Error ? error.message : 'Unknown caption fetch error.')
      }

      await wait(profileScrapePolicy.captionRequestDelayMs)
    }

    return enrichedPosts
  }

  async function waitForInitialProfileContent(session: DownloadSession, runId: number) {
    for (let attempt = 1; attempt <= profileScrapePolicy.hydrationAttempts; attempt += 1) {
      if (!isCurrentRun(session.id, runId) || isStopRequested)
        return

      const foundNewPosts = await scanVisiblePosts(session, `Hydration scan ${attempt}/${profileScrapePolicy.hydrationAttempts} before scrolling.`)

      if (foundNewPosts || scrapedPosts.length > 0)
        return

      progress = getScrapeLoopProgress(session, scrapedPosts.length, 'scraping', 'Waiting for profile posts to render.')
      await wait(profileScrapePolicy.hydrationDelayMs)
    }

    addDebugLog('warn', 'extractor', 'Initial hydration scans did not find any visible profile posts.')
  }

  async function scanVisiblePosts(session: DownloadSession, reason: string) {
    const extraction = extractProfilePostsFromDocument(document, session.profile.name, seenPostIds)
    seenPostIds = extraction.seenPostIds

    addDebugLog(
      extraction.posts.length > 0 ? 'info' : 'warn',
      'extractor',
      reason,
      [
        `selector=${extraction.diagnostics.selector}`,
        `anchors=${extraction.diagnostics.anchorCount}`,
        `duplicates=${extraction.diagnostics.duplicatePostCount}`,
        `missingMedia=${extraction.diagnostics.missingMediaCount}`,
        `missingSource=${extraction.diagnostics.missingSourceCount}`,
        `newPosts=${extraction.diagnostics.addedPostCount}`,
        `anchorSamples=${extraction.diagnostics.sampleAnchorPaths.join(', ') || 'none'}`,
        `samples=${extraction.diagnostics.samplePostPaths.join(', ') || 'none'}`,
      ].join(' | '),
    )

    if (extraction.posts.length === 0)
      return false

    scrapedPosts = [...scrapedPosts, ...extraction.posts]
    progress = getScrapeLoopProgress(session, scrapedPosts.length, 'scraping', `Found ${scrapedPosts.length} post${scrapedPosts.length === 1 ? '' : 's'}. Continuing scan.`)
    return true
  }

  function isCurrentRun(sessionId: string, runId: number) {
    return activeSession?.id === sessionId && activeRunId === runId
  }

  function cleanupSession(sessionId: string, runId: number) {
    if (!isCurrentRun(sessionId, runId))
      return

    activeSession = null
    scrapedPosts = []
    seenPostIds = new Set()
    isStopRequested = false
    lastCooldownPostCount = 0
  }

  function addDebugLog(level: ScrapeDebugEntry['level'], scope: ScrapeDebugEntry['scope'], message: string, details?: string) {
    debugLog = [...debugLog, createScrapeDebugEntry(level, scope, message, details)].slice(-profileScrapePolicy.debugLogLimit)
  }

  function wait(delayMs: number) {
    return new Promise<void>(resolve => window.setTimeout(resolve, delayMs))
  }

  return {
    getScrapeStatus,
    startProfileDownload,
    stopProfileDownload,
  }
}
