import { onMessage } from 'webext-bridge/content-script'
import { createDownloadSession } from '~/application/createDownloadSession'

// Firefox `browser.tabs.executeScript()` requires scripts return a primitive value
(() => {
  onMessage('start-profile-download', ({ data }) => {
    const session = createDownloadSession(data.profileUrl)

    return {
      accepted: false,
      message: `Profile ${session.profileName} is valid. Download flow is not implemented yet.`,
    }
  })
})()
