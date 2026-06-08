import { onMessage } from 'webext-bridge/content-script'
import { createIdleProgress } from '~/application/createIdleProgress'
import { extractProfilePostsFromDocument } from '~/application/extractProfilePostsFromDocument'
import { getCompletedScrapeProgress } from '~/application/getCompletedScrapeProgress'
import { getFailedScrapeProgress } from '~/application/getFailedScrapeProgress'
import { getRandomDelay } from '~/application/getRandomDelay'
import { getScrapeLoopProgress } from '~/application/getScrapeLoopProgress'
import { getStoppedScrapeProgress } from '~/application/getStoppedScrapeProgress'
import { hasReachedProfileEnd } from '~/application/hasReachedProfileEnd'
import { shouldApplyBatchCooldown } from '~/application/shouldApplyBatchCooldown'
import { startDownloadSession } from '~/application/startDownloadSession'
import type { DownloadSession, ScrapeProgress, ScrapedPost } from '~/domain/download'
import type { StartProfileDownloadRequest, StopProfileDownloadRequest } from '~/shared/messages'
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

  isStopRequested = false
  seenPostIds = new Set()
  lastCooldownPostCount = 0
  const extraction = extractProfilePostsFromDocument(document, activeSession.profile.name)
  seenPostIds = extraction.seenPostIds
  scrapedPosts = extraction.posts
  progress = getScrapeLoopProgress(activeSession, scrapedPosts.length, 'scraping', `Found ${scrapedPosts.length} post${scrapedPosts.length === 1 ? '' : 's'}. Continuing scan.`)

  void runProfileScrape(activeSession)

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

  if (accepted)
    activeSession = null
  if (accepted) {
    scrapedPosts = []
    seenPostIds = new Set()
  }

  return {
    accepted,
    progress,
  }
})

async function runProfileScrape(session: DownloadSession) {
  let attemptsWithoutNewPosts = 0

  try {
    while (activeSession?.id === session.id) {
      if (isStopRequested)
        break

      if (hasReachedProfileEnd(attemptsWithoutNewPosts, maxAttemptsWithoutNewPosts)) {
        progress = getCompletedScrapeProgress(session, scrapedPosts.length)
        activeSession = null
        return
      }

      const scrollDelay = getRandomDelay(scrollDelayRange.min, scrollDelayRange.max)
      await wait(scrollDelay)

      if (activeSession?.id !== session.id || isStopRequested)
        break

      window.scrollTo({ top: document.documentElement.scrollHeight, behavior: 'smooth' })
      await wait(1200)

      if (activeSession?.id !== session.id || isStopRequested)
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
      activeSession = null
      return
    }

    if (activeSession?.id === session.id)
      progress = getCompletedScrapeProgress(session, scrapedPosts.length)

    activeSession = null
  }
  catch (error) {
    progress = getFailedScrapeProgress(session, scrapedPosts.length, error instanceof Error ? error.message : 'Profile scraping failed.')
    activeSession = null
  }
}

function wait(delayMs: number) {
  return new Promise<void>(resolve => window.setTimeout(resolve, delayMs))
}
