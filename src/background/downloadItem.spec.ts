import { afterEach, describe, expect, it, vi } from 'vitest'
import { createDownloadUrl } from '~/features/downloads/background/createDownloadUrl'
import type { DownloadItem } from '~/features/downloads/domain/download'

describe('createDownloadUrl', () => {
  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('uses remote URLs directly', () => {
    const item: DownloadItem = {
      id: 'post-1:image',
      postId: 'post-1',
      kind: 'image',
      path: 'nubet/post-1/image.jpg',
      source: {
        type: 'remote-url',
        value: 'https://cdn.example.com/image.jpg',
      },
    }

    expect(createDownloadUrl(item)).toEqual({
      value: 'https://cdn.example.com/image.jpg',
    })
  })

  it('uses blob URLs for text downloads', () => {
    const createObjectURL = vi.fn(() => 'blob:caption')
    const revokeObjectURL = vi.fn()

    Object.defineProperty(URL, 'createObjectURL', {
      configurable: true,
      value: createObjectURL,
    })
    Object.defineProperty(URL, 'revokeObjectURL', {
      configurable: true,
      value: revokeObjectURL,
    })
    const item: DownloadItem = {
      id: 'post-1:caption',
      postId: 'post-1',
      kind: 'caption',
      path: 'nubet/post-1/caption.txt',
      source: {
        type: 'text',
        value: 'Photo by @nubet on January 08, 2012.',
        mimeType: 'text/plain;charset=utf-8',
      },
    }

    const downloadUrl = createDownloadUrl(item)

    expect(downloadUrl.value).toBe('blob:caption')
    expect(createObjectURL).toHaveBeenCalledWith(expect.any(Blob))

    downloadUrl.revoke?.()

    expect(revokeObjectURL).toHaveBeenCalledWith('blob:caption')
  })
})
