import type { ScrapedPost } from '../domain/profileDownload'

export type DownloadPostSelection =
  | {
    type: 'all'
  }
  | {
    type: 'range'
    startIndex: number
    endIndex: number
  }
  | {
    type: 'ids'
    postIds: string[]
  }

export function selectScrapedPosts(posts: ScrapedPost[], selection: DownloadPostSelection): ScrapedPost[] {
  switch (selection.type) {
    case 'all':
      return posts

    case 'range': {
      const startIndex = Math.max(1, Math.trunc(selection.startIndex))
      const endIndex = Math.max(1, Math.trunc(selection.endIndex))

      if (startIndex > endIndex)
        return []

      return posts.slice(startIndex - 1, endIndex)
    }

    case 'ids': {
      const selectedIds = new Set(selection.postIds)
      return posts.filter(post => selectedIds.has(post.id))
    }
  }
}
