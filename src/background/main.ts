import { registerDownloadHandlers } from '~/features/downloads/background/registerDownloadHandlers'

if (import.meta.hot) {
  // @ts-expect-error Vite dev client path
  import('/@vite/client')
  import('./contentScriptHMR')
}

registerDownloadHandlers()
