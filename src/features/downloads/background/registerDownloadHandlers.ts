import { onMessage } from 'webext-bridge/background'
import { downloadBatch } from './downloadBatch'
import { extensionMessage } from '~/features/profileDownload/contracts/messages'
import type { QueueDownloadBatchRequest } from '~/features/profileDownload/contracts/messages'

export function registerDownloadHandlers() {
  onMessage(extensionMessage.queueDownloadBatch, async ({ data }) => {
    const request = data as unknown as QueueDownloadBatchRequest
    const result = await downloadBatch(request.batch)

    return {
      accepted: true,
      queuedItemCount: request.batch.items.length,
      downloadedFileCount: result.downloadedFileCount,
      failure: result.failure,
    }
  })
}
