import type { ScrapedPost } from '~/domain/download'

const postPathMatchers = [/^\/p\//, /^\/reel\//]

export interface ExtractProfilePostsResult {
  posts: ScrapedPost[]
  seenPostIds: Set<string>
}

export function extractProfilePostsFromDocument(document: Document, profileName: string, existingSeenPostIds: Iterable<string> = []): ExtractProfilePostsResult {
  const seenPostIds = new Set(existingSeenPostIds)
  const posts: ScrapedPost[] = []
  const anchors = Array.from(document.querySelectorAll<HTMLAnchorElement>('main a[href], article a[href]'))

  for (const anchor of anchors) {
    const postId = getPostIdFromHref(anchor.getAttribute('href'))

    if (!postId || seenPostIds.has(postId))
      continue

    const image = anchor.querySelector('img')
    const imageUrl = getImageUrl(image)

    if (!imageUrl)
      continue

    seenPostIds.add(postId)
    posts.push({
      id: postId,
      imageUrl,
      caption: getCaption(image),
      profileName,
    })
  }

  return {
    posts,
    seenPostIds,
  }
}

function getPostIdFromHref(href: string | null): string | null {
  if (!href)
    return null

  const url = href.startsWith('http') ? new URL(href) : new URL(href, 'https://www.instagram.com')
  const pathname = url.pathname

  if (!postPathMatchers.some(matcher => matcher.test(pathname)))
    return null

  const [, postId] = pathname.split('/').filter(Boolean)

  return postId || null
}

function getImageUrl(image: HTMLImageElement | null): string | null {
  if (!image)
    return null

  const src = image.currentSrc || image.src || image.getAttribute('src')

  if (!src)
    return null

  return src.trim() || null
}

function getCaption(image: HTMLImageElement | null): string {
  return image?.getAttribute('alt')?.trim() || ''
}
