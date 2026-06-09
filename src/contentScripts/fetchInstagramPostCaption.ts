import type { GraphQLResponse, PostPageData } from '~/domain/instagram'

const GRAPHQL_QUERY_HASH = '2b0673e0dc4580674a88d426fe00ea90'

export async function fetchInstagramPostCaption(shortcode: string): Promise<string> {
  try {
    return await fetchCaptionViaGraphQL(shortcode)
  }
  catch {
    // GraphQL failed, fall through
  }

  try {
    return await fetchCaptionViaPostPage(shortcode)
  }
  catch {
    // Post page fetch failed, fall through
  }

  return ''
}

async function fetchCaptionViaGraphQL(shortcode: string): Promise<string> {
  const variables = JSON.stringify({ shortcode })
  const response = await fetch(
    `https://www.instagram.com/graphql/query/?query_hash=${GRAPHQL_QUERY_HASH}&variables=${encodeURIComponent(variables)}`,
    {
      credentials: 'include',
      headers: createInstagramHeaders(),
      method: 'GET',
      referrer: window.location.href,
      referrerPolicy: 'strict-origin-when-cross-origin',
    },
  )

  if (!response.ok)
    throw new Error(`GraphQL query failed with status ${response.status}.`)

  const body = await response.json() as GraphQLResponse
  const caption = extractCaptionFromGraphQL(body)

  if (caption)
    return caption

  throw new Error('No caption found in GraphQL response.')
}

function extractCaptionFromGraphQL(body: GraphQLResponse): string {
  const edges = body?.data?.shortcode_media?.edge_media_to_caption?.edges

  if (edges?.length) {
    const text = edges[0]?.node?.text

    if (text)
      return text.trim()
  }

  const caption = body?.data?.shortcode_media?.caption

  if (typeof caption === 'string')
    return caption.trim()

  return ''
}

async function fetchCaptionViaPostPage(shortcode: string): Promise<string> {
  const response = await fetch(`https://www.instagram.com/p/${shortcode}/`, {
    credentials: 'include',
    headers: createInstagramHeaders(),
    method: 'GET',
    referrer: window.location.href,
    referrerPolicy: 'strict-origin-when-cross-origin',
  })

  if (!response.ok)
    throw new Error(`Post page fetch failed with status ${response.status}.`)

  const html = await response.text()

  const fromJsonLd = extractCaptionFromJsonLd(html)

  if (fromJsonLd)
    return fromJsonLd

  const fromMeta = extractCaptionFromMetaTags(html)

  if (fromMeta)
    return fromMeta

  throw new Error('Could not extract caption from post page.')
}

function extractCaptionFromJsonLd(html: string): string {
  const match = html.match(/<script type="application\/ld\+json">(.+?)<\/script>/)

  if (!match)
    return ''

  try {
    const data = JSON.parse(match[1]) as PostPageData | PostPageData[]
    const items = Array.isArray(data) ? data : [data]

    for (const item of items) {
      if (typeof item.caption === 'string')
        return item.caption.trim()
    }
  }
  catch {
    // JSON parse failed
  }

  return ''
}

function extractCaptionFromMetaTags(html: string): string {
  const match = html.match(/<meta\s+property="og:description"\s+content="([^"]+)"/i)

  return match?.[1]?.trim() ?? ''
}

function createInstagramHeaders(): Record<string, string> {
  const headers: Record<string, string> = {
    'x-ig-app-id': '936619743392459',
    'x-requested-with': 'XMLHttpRequest',
  }
  const csrfToken = getCookieValue('csrftoken')
  const claim = sessionStorage.getItem('www-claim-v2')

  if (csrfToken)
    headers['x-csrftoken'] = csrfToken

  if (claim)
    headers['x-ig-www-claim'] = claim

  return headers
}

function getCookieValue(name: string): string | undefined {
  return document.cookie
    .split('; ')
    .find(row => row.startsWith(`${name}=`))
    ?.split('=')[1]
}
