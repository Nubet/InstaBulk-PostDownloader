import type { DownloadSession } from '../domain/profileDownload'
import type { ScrapeDebugEntry, ScrapeProgress } from '../presentation/scrapeState'
import type { DownloadBatch, ScrapeFailure } from '~/features/downloads/domain/download'

export const extensionMessage = {
  getScrapeStatus: 'scrape/get-status',
  startProfileDownload: 'scrape/start-profile-download',
  stopProfileDownload: 'scrape/stop-profile-download',
  queueDownloadBatch: 'downloads/queue-batch',
} as const

export interface GetScrapeStatusResponse {
  progress: ScrapeProgress
  debugLog: ScrapeDebugEntry[]
}

export interface StartProfileDownloadRequest {
  profileUrl: string
}

export interface StartProfileDownloadResponse {
  accepted: boolean
  session: DownloadSession | null
  progress: ScrapeProgress
  debugLog: ScrapeDebugEntry[]
}

export interface StopProfileDownloadRequest {
  sessionId: string
}

export interface StopProfileDownloadResponse {
  accepted: boolean
  progress: ScrapeProgress
  debugLog: ScrapeDebugEntry[]
}

export interface QueueDownloadBatchRequest {
  batch: DownloadBatch
}

export interface QueueDownloadBatchResponse {
  accepted: boolean
  queuedItemCount: number
  downloadedFileCount: number
  failure: ScrapeFailure | null
}
