import type { DownloadSession, ScrapeProgress } from '~/domain/download'

export function getFailedScrapeProgress(session: DownloadSession, discoveredPostCount: number, message: string): ScrapeProgress {
  return {
    sessionId: session.id,
    profileName: session.profile.name,
    phase: 'failed',
    discoveredPostCount,
    queuedFileCount: 0,
    downloadedFileCount: 0,
    message,
  }
}
