import type { DownloadSession, ScrapeProgress } from '~/domain/download'

export function getScrapeLoopProgress(session: DownloadSession, discoveredPostCount: number, phase: 'scraping' | 'cooldown', message: string): ScrapeProgress {
  return {
    sessionId: session.id,
    profileName: session.profile.name,
    phase,
    discoveredPostCount,
    queuedFileCount: 0,
    downloadedFileCount: 0,
    message,
  }
}
