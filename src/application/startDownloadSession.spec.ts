import { describe, expect, it, vi } from 'vitest'
import { startDownloadSession } from '~/features/profileDownload/application/startDownloadSession'
import type { DownloadSession } from '~/features/profileDownload/domain/profileDownload'
import type { ScrapeProgress } from '~/features/profileDownload/presentation/scrapeState'

describe('startDownloadSession', () => {
  it('starts a new session when none is active', () => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date('2026-06-08T10:00:00.000Z'))
    vi.spyOn(crypto, 'randomUUID').mockReturnValue('11111111-1111-1111-1111-111111111111')

    const currentProgress: ScrapeProgress = {
      sessionId: null,
      profileName: null,
      phase: 'idle',
      discoveredPostCount: 0,
      queuedFileCount: 0,
      downloadedFileCount: 0,
      message: 'Ready to start.',
    }

    expect(startDownloadSession(null, currentProgress, 'https://www.instagram.com/nubet/')).toEqual({
      accepted: true,
      session: {
        id: '11111111-1111-1111-1111-111111111111',
        profile: {
          name: 'nubet',
          url: 'https://www.instagram.com/nubet/',
          targetRoot: 'nubet',
        },
        startedAt: '2026-06-08T10:00:00.000Z',
      },
      progress: {
        sessionId: '11111111-1111-1111-1111-111111111111',
        profileName: 'nubet',
        phase: 'starting',
        discoveredPostCount: 0,
        queuedFileCount: 0,
        downloadedFileCount: 0,
        message: 'Download started for @nubet.',
      },
    })

    vi.restoreAllMocks()
    vi.useRealTimers()
  })

  it('rejects a second start while a session is active', () => {
    const session: DownloadSession = {
      id: '11111111-1111-1111-1111-111111111111',
      profile: {
        name: 'nubet',
        url: 'https://www.instagram.com/nubet/',
        targetRoot: 'nubet',
      },
      startedAt: '2026-06-08T10:00:00.000Z',
    }

    const currentProgress: ScrapeProgress = {
      sessionId: session.id,
      profileName: session.profile.name,
      phase: 'starting',
      discoveredPostCount: 0,
      queuedFileCount: 0,
      downloadedFileCount: 0,
      message: 'Download started for @nubet.',
    }

    expect(startDownloadSession(session, currentProgress, 'https://www.instagram.com/other/')).toEqual({
      accepted: false,
      session,
      progress: {
        ...currentProgress,
        message: 'Download already running for @nubet.',
      },
    })
  })
})
