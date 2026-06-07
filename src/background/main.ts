// only on dev mode
if (import.meta.hot) {
  // @ts-expect-error for background HMR
  import('/@vite/client')
  // load latest content script
  import('./contentScriptHMR')
}

interface BrowserWithSidePanel {
  sidePanel?: {
    setPanelBehavior: (options: { openPanelOnActionClick: boolean }) => Promise<void>
  }
}

const sidePanel = (browser as unknown as BrowserWithSidePanel).sidePanel

sidePanel
  ?.setPanelBehavior({ openPanelOnActionClick: true })
  .catch(() => {})
