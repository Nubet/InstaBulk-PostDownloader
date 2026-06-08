export interface InstagramProfile {
  name: string
  url: string
  targetRoot: string
}

export interface ScrapedPost {
  id: string
  imageUrl: string
  caption: string
  profileName: string
}

export interface DownloadSession {
  id: string
  profile: InstagramProfile
  startedAt: string
}

export interface ScrapeDebugEntry {
  id: string
  timestamp: string
  level: 'info' | 'warn' | 'error'
  scope: 'session' | 'extractor' | 'downloads'
  message: string
  details?: string
}

export interface DownloadBatch {
  sessionId: string
  profile: InstagramProfile
  posts: ScrapedPost[]
  items: DownloadItem[]
}

export interface DownloadItem {
  id: string
  postId: string
  kind: 'image' | 'caption'
  path: string
  source: DownloadSource
}

export type DownloadSource =
  | {
    type: 'remote-url'
    value: string
  }
  | {
    type: 'text'
    value: string
    mimeType: 'text/plain;charset=utf-8'
  }

export type ScrapePhase =
  | 'idle'
  | 'validating-tab'
  | 'starting'
  | 'scraping'
  | 'cooldown'
  | 'saving'
  | 'completed'
  | 'stopped'
  | 'failed'

export interface ScrapeProgress {
  sessionId: string | null
  profileName: string | null
  phase: ScrapePhase
  discoveredPostCount: number
  queuedFileCount: number
  downloadedFileCount: number
  message: string
}

export interface ScrapeFailure {
  sessionId: string
  postId: string | null
  itemId: string | null
  message: string
}
