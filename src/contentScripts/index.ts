import { onMessage } from 'webext-bridge/content-script'
import { createScrapeSummaryProgress } from '~/application/createScrapeSummaryProgress'
import { createIdleProgress } from '~/application/createIdleProgress'
import { extractProfilePostsFromDocument } from '~/application/extractProfilePostsFromDocument'
import { startDownloadSession } from '~/application/startDownloadSession'
import type { DownloadSession, ScrapeProgress, ScrapedPost } from '~/domain/download'
import type { StartProfileDownloadRequest, StopProfileDownloadRequest } from '~/shared/messages'
import { extensionMessage } from '~/shared/messages'

let activeSession: DownloadSession | null = null
let progress: ScrapeProgress = createIdleProgress('Open a public Instagram profile first.')
let scrapedPosts: ScrapedPost[] = []
let seenPostIds = new Set<string>()

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

  seenPostIds = new Set()
  const extraction = extractProfilePostsFromDocument(document, activeSession.profile.name, seenPostIds)
  seenPostIds = extraction.seenPostIds
  scrapedPosts = extraction.posts
  progress = createScrapeSummaryProgress(activeSession, scrapedPosts)

  return {
    ...response,
    progress,
  }
})

onMessage(extensionMessage.stopProfileDownload, ({ data }) => {
  const request = data as unknown as StopProfileDownloadRequest
  const accepted = activeSession?.id === request.sessionId

  progress = accepted
    ? {
        ...progress,
        phase: 'stopped',
        message: 'Session stopped.',
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
