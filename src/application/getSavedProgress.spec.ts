import { describe, expect, it } from 'vitest'
import { getSavedProgress } from '~/features/profileDownload/presentation/scrapeState'
import type { DownloadSession } from '~/features/profileDownload/domain/profileDownload'

describe('getSavedProgress', () => {
  it('creates completed progress with downloaded file count', () => {
    const session: DownloadSession = {
      id: '11111111-1111-1111-1111-111111111111',
      profile: {
        name: 'nubet',
        url: 'https://www.instagram.com/nubet/',
        targetRoot: 'nubet',
      },
      startedAt: '2026-06-08T10:00:00.000Z',
    }

    expect(getSavedProgress(session, 3, 6, 5)).toEqual({
      sessionId: session.id,
      profileName: 'nubet',
      phase: 'completed',
      discoveredPostCount: 3,
      queuedFileCount: 6,
      downloadedFileCount: 5,
      message: 'Saved 5 of 6 files.',
    })
  })

  it('appends a warning when some files fail', () => {
    const session: DownloadSession = {
      id: '11111111-1111-1111-1111-111111111111',
      profile: {
        name: 'nubet',
        url: 'https://www.instagram.com/nubet/',
        targetRoot: 'nubet',
      },
      startedAt: '2026-06-08T10:00:00.000Z',
    }

    expect(getSavedProgress(session, 3, 6, 5, 'One file failed.')).toEqual({
      sessionId: session.id,
      profileName: 'nubet',
      phase: 'completed',
      discoveredPostCount: 3,
      queuedFileCount: 6,
      downloadedFileCount: 5,
      message: 'Saved 5 of 6 files. One file failed.',
    })
  })
})
