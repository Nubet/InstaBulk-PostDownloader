import type { DownloadSession, ScrapeProgress } from '~/domain/download'

export function createSessionProgress(session: DownloadSession, message = `Download started for @${session.profile.name}.`): ScrapeProgress {
  return {
    sessionId: session.id,
    profileName: session.profile.name,
    phase: 'starting',
    discoveredPostCount: 0,
    queuedFileCount: 0,
    downloadedFileCount: 0,
    message,
  }
}
