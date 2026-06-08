import { describe, expect, it } from 'vitest'
import { createScrapeSummaryProgress } from './createScrapeSummaryProgress'
import type { DownloadSession, ScrapedPost } from '~/domain/download'

describe('createScrapeSummaryProgress', () => {
  const session: DownloadSession = {
    id: '11111111-1111-1111-1111-111111111111',
    profile: {
      name: 'nubet',
      url: 'https://www.instagram.com/nubet/',
      targetRoot: 'nubet',
    },
    startedAt: '2026-06-08T10:00:00.000Z',
  }

  it('creates a completed progress summary with post count', () => {
    const posts: ScrapedPost[] = [
      {
        id: 'post-1',
        imageUrl: 'https://cdn.example.com/post-1.jpg',
        caption: 'Caption',
        profileName: 'nubet',
      },
    ]

    expect(createScrapeSummaryProgress(session, posts)).toEqual({
      sessionId: session.id,
      profileName: 'nubet',
      phase: 'completed',
      discoveredPostCount: 1,
      queuedFileCount: 0,
      downloadedFileCount: 0,
      message: 'Found 1 post on the loaded profile page.',
    })
  })

  it('reports when the loaded page has no posts', () => {
    expect(createScrapeSummaryProgress(session, [])).toEqual({
      sessionId: session.id,
      profileName: 'nubet',
      phase: 'completed',
      discoveredPostCount: 0,
      queuedFileCount: 0,
      downloadedFileCount: 0,
      message: 'No posts found on the loaded profile page.',
    })
  })
})
