import type { DownloadSession, ScrapedPost } from '../domain/profileDownload'
import type { DownloadBatch, DownloadItem } from '~/features/downloads/domain/download'

export function buildDownloadBatch(session: DownloadSession, posts: ScrapedPost[]): DownloadBatch {
  return {
    sessionId: session.id,
    profile: session.profile,
    posts,
    items: posts.flatMap(post => createDownloadItems(session, post)),
  }
}

function createDownloadItems(session: DownloadSession, post: ScrapedPost): DownloadItem[] {
  const basePath = `${session.profile.targetRoot}/${post.id}`
  const items: DownloadItem[] = [
    {
      id: `${post.id}:image`,
      postId: post.id,
      kind: 'image',
      path: `${basePath}/image.jpg`,
      source: {
        type: 'remote-url',
        value: post.imageUrl,
      },
    },
  ]

  const caption = post.caption.trim()

  if (caption) {
    items.push({
      id: `${post.id}:caption`,
      postId: post.id,
      kind: 'caption',
      path: `${basePath}/caption.txt`,
      source: {
        type: 'text',
        value: caption,
        mimeType: 'text/plain;charset=utf-8',
      },
    })
  }

  return items
}
