import { describe, expect, it } from 'vitest'
import { getSavingProgress } from '~/features/profileDownload/presentation/scrapeState'
import type { DownloadSession } from '~/features/profileDownload/domain/profileDownload'

describe('getSavingProgress', () => {
  it('creates saving progress with queued file count', () => {
    const session: DownloadSession = {
      id: '11111111-1111-1111-1111-111111111111',
      profile: {
        name: 'nubet',
        url: 'https://www.instagram.com/nubet/',
        targetRoot: 'nubet',
      },
      startedAt: '2026-06-08T10:00:00.000Z',
    }

    expect(getSavingProgress(session, 3, 6)).toEqual({
      sessionId: session.id,
      profileName: 'nubet',
      phase: 'saving',
      discoveredPostCount: 3,
      queuedFileCount: 6,
      downloadedFileCount: 0,
      message: 'Saving 6 files.',
    })
  })
})
