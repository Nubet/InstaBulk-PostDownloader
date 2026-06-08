import type { DownloadBatch, DownloadItem, DownloadSession, ScrapedPost } from '~/domain/download'

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

  return [
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
    {
      id: `${post.id}:caption`,
      postId: post.id,
      kind: 'caption',
      path: `${basePath}/caption.txt`,
      source: {
        type: 'text',
        value: post.caption,
        mimeType: 'text/plain;charset=utf-8',
      },
    },
  ]
}
