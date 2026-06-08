import type { DownloadItem } from '~/domain/download'

export async function downloadItem(item: DownloadItem): Promise<void> {
  await browser.downloads.download({
    url: getDownloadUrl(item),
    filename: item.path,
    saveAs: false,
    conflictAction: 'overwrite',
  })
}

function getDownloadUrl(item: DownloadItem): string {
  if (item.source.type === 'remote-url')
    return item.source.value

  return `data:${item.source.mimeType},${encodeURIComponent(item.source.value)}`
}
