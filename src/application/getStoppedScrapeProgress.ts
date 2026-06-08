import type { DownloadSession, ScrapeProgress } from '~/domain/download'

export function getStoppedScrapeProgress(session: DownloadSession, discoveredPostCount: number): ScrapeProgress {
  return {
    sessionId: session.id,
    profileName: session.profile.name,
    phase: 'stopped',
    discoveredPostCount,
    queuedFileCount: 0,
    downloadedFileCount: 0,
    message: `Stopped after ${discoveredPostCount} post${discoveredPostCount === 1 ? '' : 's'}.`,
  }
}
