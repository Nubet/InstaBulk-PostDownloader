import { onMessage, sendMessage } from 'webext-bridge/content-script'
import { buildDownloadBatch } from '~/application/buildDownloadBatch'
import { createIdleProgress } from '~/application/createIdleProgress'
import { extractProfilePostsFromDocument } from '~/application/extractProfilePostsFromDocument'
import { getCompletedScrapeProgress } from '~/application/getCompletedScrapeProgress'
import { getFailedScrapeProgress } from '~/application/getFailedScrapeProgress'
import { getRandomDelay } from '~/application/getRandomDelay'
import { getSavedProgress } from '~/application/getSavedProgress'
import { getScrapeLoopProgress } from '~/application/getScrapeLoopProgress'
import { getSavingProgress } from '~/application/getSavingProgress'
import { getStoppedScrapeProgress } from '~/application/getStoppedScrapeProgress'
import { hasReachedProfileEnd } from '~/application/hasReachedProfileEnd'
import { shouldApplyBatchCooldown } from '~/application/shouldApplyBatchCooldown'
import { startDownloadSession } from '~/application/startDownloadSession'
import type { DownloadSession, ScrapeProgress, ScrapedPost } from '~/domain/download'
import type { QueueDownloadBatchResponse, StartProfileDownloadRequest, StopProfileDownloadRequest } from '~/shared/messages'
import { extensionMessage } from '~/shared/messages'

const scrollDelayRange = { min: 2000, max: 5500 }
const cooldownDelayRange = { min: 60000, max: 120000 }
const maxAttemptsWithoutNewPosts = 3
const cooldownBatchSize = 30

let activeSession: DownloadSession | null = null
let progress: ScrapeProgress = createIdleProgress('Open a public Instagram profile first.')
let scrapedPosts: ScrapedPost[] = []
let seenPostIds = new Set<string>()
let isStopRequested = false
let lastCooldownPostCount = 0
let activeRunId = 0

onMessage(extensionMessage.getScrapeStatus, () => {
  return { progress }
})

onMessage(extensionMessage.startProfileDownload, ({ data }) => {
  const request = data as unknown as StartProfileDownloadRequest
  const response = startDownloadSession(activeSession, progress, request.profileUrl)

  activeSession = response.session
  progress = response.progress

  if (!response.accepted || !activeSession)
    return response

  activeRunId += 1
  const runId = activeRunId
  isStopRequested = false
  seenPostIds = new Set()
  lastCooldownPostCount = 0
  const extraction = extractProfilePostsFromDocument(document, activeSession.profile.name)
  seenPostIds = extraction.seenPostIds
  scrapedPosts = extraction.posts
  progress = getScrapeLoopProgress(activeSession, scrapedPosts.length, 'scraping', `Found ${scrapedPosts.length} post${scrapedPosts.length === 1 ? '' : 's'}. Continuing scan.`)

  void runProfileScrape(activeSession, runId)

  return {
    ...response,
    progress,
  }
})

onMessage(extensionMessage.stopProfileDownload, ({ data }) => {
  const request = data as unknown as StopProfileDownloadRequest
  const accepted = activeSession?.id === request.sessionId

  if (accepted)
    isStopRequested = true

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
    progress,
  }
})

async function runProfileScrape(session: DownloadSession, runId: number) {
  let attemptsWithoutNewPosts = 0

  try {
    while (isCurrentRun(session.id, runId)) {
      if (isStopRequested)
        break

      if (hasReachedProfileEnd(attemptsWithoutNewPosts, maxAttemptsWithoutNewPosts)) {
        await saveScrapedPosts(session, runId)
        cleanupSession(session.id, runId)
        return
      }

      const scrollDelay = getRandomDelay(scrollDelayRange.min, scrollDelayRange.max)
      await wait(scrollDelay)

      if (!isCurrentRun(session.id, runId) || isStopRequested)
        break

      window.scrollTo({ top: document.documentElement.scrollHeight, behavior: 'smooth' })
      await wait(1200)

      if (!isCurrentRun(session.id, runId) || isStopRequested)
        break

      const extraction = extractProfilePostsFromDocument(document, session.profile.name, seenPostIds)
      seenPostIds = extraction.seenPostIds

      if (extraction.posts.length > 0) {
        attemptsWithoutNewPosts = 0
        scrapedPosts = [...scrapedPosts, ...extraction.posts]
        progress = getScrapeLoopProgress(session, scrapedPosts.length, 'scraping', `Found ${scrapedPosts.length} post${scrapedPosts.length === 1 ? '' : 's'}. Continuing scan.`)
      }
      else {
        attemptsWithoutNewPosts += 1
        progress = getScrapeLoopProgress(session, scrapedPosts.length, 'scraping', `No new posts found. Retry ${attemptsWithoutNewPosts}/${maxAttemptsWithoutNewPosts}.`)
      }

      if (shouldApplyBatchCooldown(scrapedPosts.length, lastCooldownPostCount, cooldownBatchSize)) {
        lastCooldownPostCount = scrapedPosts.length
        const cooldownDelay = getRandomDelay(cooldownDelayRange.min, cooldownDelayRange.max)
        progress = getScrapeLoopProgress(session, scrapedPosts.length, 'cooldown', `Cooling down after ${scrapedPosts.length} posts.`)
        await wait(cooldownDelay)
      }
    }

    if (isStopRequested) {
      progress = getStoppedScrapeProgress(session, scrapedPosts.length)
      cleanupSession(session.id, runId)
      return
    }

    if (isCurrentRun(session.id, runId))
      await saveScrapedPosts(session, runId)

    cleanupSession(session.id, runId)
  }
  catch (error) {
    progress = getFailedScrapeProgress(session, scrapedPosts.length, error instanceof Error ? error.message : 'Profile scraping failed.')
    cleanupSession(session.id, runId)
  }
}

function wait(delayMs: number) {
  return new Promise<void>(resolve => window.setTimeout(resolve, delayMs))
}

async function saveScrapedPosts(session: DownloadSession, runId: number) {
  const batch = buildDownloadBatch(session, scrapedPosts)
  progress = getSavingProgress(session, scrapedPosts.length, batch.items.length)
  const payload = { batch } as unknown as never

  const response = await sendMessage(
    extensionMessage.queueDownloadBatch,
    payload,
    { context: 'background' } as never,
  ) as unknown as QueueDownloadBatchResponse

  if (!isCurrentRun(session.id, runId))
    return

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
