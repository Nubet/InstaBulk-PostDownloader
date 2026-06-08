import type { DownloadSession, ScrapeProgress } from '~/domain/download'

export function getSavingProgress(session: DownloadSession, discoveredPostCount: number, queuedFileCount: number): ScrapeProgress {
  return {
    sessionId: session.id,
    profileName: session.profile.name,
    phase: 'saving',
    discoveredPostCount,
    queuedFileCount,
    downloadedFileCount: 0,
    message: `Saving ${queuedFileCount} file${queuedFileCount === 1 ? '' : 's'}.`,
  }
}
