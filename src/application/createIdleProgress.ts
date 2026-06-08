import type { ScrapeProgress } from '~/domain/download'

export function createIdleProgress(message = 'Ready to start.'): ScrapeProgress {
  return {
    sessionId: null,
    profileName: null,
    phase: 'idle',
    discoveredPostCount: 0,
    queuedFileCount: 0,
    downloadedFileCount: 0,
    message,
  }
}
