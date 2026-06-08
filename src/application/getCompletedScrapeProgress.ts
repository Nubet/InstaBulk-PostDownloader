import type { DownloadSession, ScrapeProgress } from '~/domain/download'

export function getCompletedScrapeProgress(session: DownloadSession, discoveredPostCount: number): ScrapeProgress {
  return {
    sessionId: session.id,
    profileName: session.profile.name,
    phase: 'completed',
    discoveredPostCount,
    queuedFileCount: 0,
    downloadedFileCount: 0,
    message: discoveredPostCount > 0
      ? `Found ${discoveredPostCount} post${discoveredPostCount === 1 ? '' : 's'} on the profile.`
      : 'No posts found on the profile.',
  }
}
