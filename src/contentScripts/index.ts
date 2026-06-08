import { onMessage } from 'webext-bridge/content-script'
import { createIdleProgress } from '~/application/createIdleProgress'
import { startDownloadSession } from '~/application/startDownloadSession'
import type { DownloadSession, ScrapeProgress } from '~/domain/download'
import type { StartProfileDownloadRequest, StopProfileDownloadRequest } from '~/shared/messages'
import { extensionMessage } from '~/shared/messages'

let activeSession: DownloadSession | null = null
let progress: ScrapeProgress = createIdleProgress('Open a public Instagram profile first.')

onMessage(extensionMessage.getScrapeStatus, () => {
  return { progress }
})

onMessage(extensionMessage.startProfileDownload, ({ data }) => {
  const request = data as unknown as StartProfileDownloadRequest
  const response = startDownloadSession(activeSession, progress, request.profileUrl)

  activeSession = response.session
  progress = response.progress

  return response
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

  return {
    accepted,
    progress,
  }
})
