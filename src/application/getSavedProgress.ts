import type { DownloadSession, ScrapeProgress } from '~/domain/download'

export function getSavedProgress(
  session: DownloadSession,
  discoveredPostCount: number,
  queuedFileCount: number,
  downloadedFileCount: number,
  warningMessage?: string,
): ScrapeProgress {
  return {
    sessionId: session.id,
    profileName: session.profile.name,
    phase: 'completed',
    discoveredPostCount,
    queuedFileCount,
    downloadedFileCount,
    message: warningMessage
      ? `Saved ${downloadedFileCount} of ${queuedFileCount} files. ${warningMessage}`
      : `Saved ${downloadedFileCount} of ${queuedFileCount} files.`,
  }
}
