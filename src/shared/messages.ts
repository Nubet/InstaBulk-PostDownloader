import type { DownloadBatch, DownloadSession, ScrapeFailure, ScrapeProgress } from '~/domain/download'

export const extensionMessage = {
  getScrapeStatus: 'scrape/get-status',
  startProfileDownload: 'scrape/start-profile-download',
  stopProfileDownload: 'scrape/stop-profile-download',
  queueDownloadBatch: 'downloads/queue-batch',
  downloadBatchQueued: 'downloads/batch-queued',
  scrapeFailed: 'scrape/failed',
} as const

export interface GetScrapeStatusRequest {
  tabId: number
}

export interface GetScrapeStatusResponse {
  progress: ScrapeProgress
}

export interface StartProfileDownloadRequest {
  profileUrl: string
}

export interface StartProfileDownloadResponse {
  accepted: boolean
  session: DownloadSession | null
  progress: ScrapeProgress
}

export interface StopProfileDownloadRequest {
  sessionId: string
}

export interface StopProfileDownloadResponse {
  accepted: boolean
  progress: ScrapeProgress
}

export interface QueueDownloadBatchRequest {
  batch: DownloadBatch
}

export interface QueueDownloadBatchResponse {
  accepted: boolean
  queuedItemCount: number
  failure: ScrapeFailure | null
}
