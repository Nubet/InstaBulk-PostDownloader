import { onMessage } from 'webext-bridge/content-script'
import { createDownloadSession } from '~/application/createDownloadSession'
import { createIdleProgress } from '~/application/createIdleProgress'
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

  activeSession = createDownloadSession(request.profileUrl)
  progress = {
    sessionId: activeSession.id,
    profileName: activeSession.profile.name,
    phase: 'starting',
    discoveredPostCount: 0,
    queuedFileCount: 0,
    downloadedFileCount: 0,
    message: `Session ready for ${activeSession.profile.name}.`,
  }

  return {
    accepted: true,
    session: activeSession,
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

  return {
    accepted,
    progress,
  }
})
