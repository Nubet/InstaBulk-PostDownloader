import browser from 'webextension-polyfill'
import type { DownloadItem } from '../domain/download'
import { createDownloadUrl } from './createDownloadUrl'

export async function downloadItem(item: DownloadItem): Promise<void> {
  const downloadUrl = createDownloadUrl(item)

  try {
    await browser.downloads.download({
      url: downloadUrl.value,
      filename: item.path,
      saveAs: false,
      conflictAction: 'overwrite',
    })
  }
  finally {
    downloadUrl.revoke?.()
  }
}
