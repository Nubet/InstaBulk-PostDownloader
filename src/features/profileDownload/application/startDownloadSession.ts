import { createDownloadSession } from '../domain/profileDownload'
import { createSessionProgress, isActiveScrapePhase } from '../presentation/scrapeState'
import type { DownloadSession } from '../domain/profileDownload'
import type { ScrapeProgress } from '../presentation/scrapeState'

export interface StartDownloadSessionResult {
  accepted: boolean
  session: DownloadSession | null
  progress: ScrapeProgress
}

export function startDownloadSession(activeSession: DownloadSession | null, currentProgress: ScrapeProgress, profileUrl: string): StartDownloadSessionResult {
  if (activeSession && isActiveScrapePhase(currentProgress.phase)) {
    return {
      accepted: false,
      session: activeSession,
      progress: {
        ...currentProgress,
        message: `Download already running for @${activeSession.profile.name}.`,
      },
    }
  }

  const session = createDownloadSession(profileUrl)

  return {
    accepted: true,
    session,
    progress: createSessionProgress(session),
  }
}
