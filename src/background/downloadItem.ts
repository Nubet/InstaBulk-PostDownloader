import { createDownloadUrl } from './createDownloadUrl'
import type { DownloadItem } from '~/domain/download'

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
