import { describe, expect, it, vi } from 'vitest'
import { createDownloadSession } from '~/features/profileDownload/domain/profileDownload'

describe('createDownloadSession', () => {
  it('creates a session from a profile url', () => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date('2026-06-08T10:00:00.000Z'))
    vi.spyOn(crypto, 'randomUUID').mockReturnValue('11111111-1111-1111-1111-111111111111')

    expect(createDownloadSession('https://www.instagram.com/nubet/')).toEqual({
      id: '11111111-1111-1111-1111-111111111111',
      profile: {
        name: 'nubet',
        url: 'https://www.instagram.com/nubet/',
        targetRoot: 'nubet',
      },
      startedAt: '2026-06-08T10:00:00.000Z',
    })

    vi.restoreAllMocks()
    vi.useRealTimers()
  })
})
