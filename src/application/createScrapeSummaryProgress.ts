import type { DownloadSession, ScrapeProgress, ScrapedPost } from '~/domain/download'

export function createScrapeSummaryProgress(session: DownloadSession, posts: ScrapedPost[]): ScrapeProgress {
  return {
    sessionId: session.id,
    profileName: session.profile.name,
    phase: 'completed',
    discoveredPostCount: posts.length,
    queuedFileCount: 0,
    downloadedFileCount: 0,
    message: posts.length > 0
      ? `Found ${posts.length} post${posts.length === 1 ? '' : 's'} on the loaded profile page.`
      : 'No posts found on the loaded profile page.',
  }
}
