import { onMessage } from 'webext-bridge/background'
import { downloadBatch } from './downloadBatch'
import type { QueueDownloadBatchRequest } from '~/shared/messages'
import { extensionMessage } from '~/shared/messages'

if (import.meta.hot) {
  // @ts-expect-error Vite dev client path
  import('/@vite/client')
  import('./contentScriptHMR')
}

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
