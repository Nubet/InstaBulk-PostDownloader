import { onMessage } from 'webext-bridge/background'
import type { QueueDownloadBatchRequest } from '~/shared/messages'
import { extensionMessage } from '~/shared/messages'

if (import.meta.hot) {
  // @ts-expect-error Vite dev client path
  import('/@vite/client')
  import('./contentScriptHMR')
}

onMessage(extensionMessage.queueDownloadBatch, ({ data }) => {
  const request = data as unknown as QueueDownloadBatchRequest

  return {
    accepted: true,
    queuedItemCount: request.batch.items.length,
    failure: null,
  }
})
