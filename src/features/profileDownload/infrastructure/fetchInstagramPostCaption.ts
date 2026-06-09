interface GraphQLResponse {
  data?: {
    shortcode_media?: {
      edge_media_to_caption?: {
        edges?: {
          node?: {
            text?: string
          }
        }[]
      }
      caption?: string
    }
  }
}

interface PostPageData {
  caption?: string
}

const graphQlQueryHash = '2b0673e0dc4580674a88d426fe00ea90'

export async function fetchInstagramPostCaption(shortcode: string): Promise<string> {
  try {
    return await fetchCaptionViaGraphQl(shortcode)
  }
  catch {
  }

  try {
    return await fetchCaptionViaPostPage(shortcode)
  }
  catch {
  }

  return ''
}

async function fetchCaptionViaGraphQl(shortcode: string): Promise<string> {
  const variables = JSON.stringify({ shortcode })
  const response = await fetch(
    `https://www.instagram.com/graphql/query/?query_hash=${graphQlQueryHash}&variables=${encodeURIComponent(variables)}`,
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
  const caption = extractCaptionFromGraphQl(body)

  if (caption)
    return caption

  throw new Error('No caption found in GraphQL response.')
}

function extractCaptionFromGraphQl(body: GraphQLResponse): string {
  const edges = body?.data?.shortcode_media?.edge_media_to_caption?.edges

  if (edges?.length) {
    const text = edges[0]?.node?.text

    if (text)
      return sanitizeCaption(text)
  }

  const caption = body?.data?.shortcode_media?.caption

  if (typeof caption === 'string')
    return sanitizeCaption(caption)

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
  const jsonLdCaption = extractCaptionFromJsonLd(html)

  if (jsonLdCaption)
    return jsonLdCaption

  const metaCaption = extractCaptionFromMetaTags(html)

  if (metaCaption)
    return metaCaption

  throw new Error('Could not extract caption from post page.')
}

function extractCaptionFromJsonLd(html: string): string {
  const document = parseHtmlDocument(html)
  const scripts = Array.from(document.querySelectorAll('script[type="application/ld+json"]'))

  for (const script of scripts) {
    try {
      const data = JSON.parse(script.textContent ?? '') as PostPageData | PostPageData[]
      const items = Array.isArray(data) ? data : [data]

      for (const item of items) {
        if (typeof item.caption === 'string')
          return sanitizeCaption(item.caption)
      }
    }
    catch {
    }
  }

  return ''
}

function extractCaptionFromMetaTags(html: string): string {
  const document = parseHtmlDocument(html)
  const content = document.querySelector('meta[property="og:description"]')?.getAttribute('content')

  return sanitizeCaption(content)
}

function normalizeCaption(value: string | null | undefined): string {
  if (!value)
    return ''

  return decodeHtmlEntities(value).trim()
}

function sanitizeCaption(value: string | null | undefined): string {
  const caption = normalizeCaption(value)

  if (!caption)
    return ''

  const quotedCaptionMatch = caption.match(/^\d[\d,.\s]*likes?,\s+\d[\d,.\s]*comments?\s+-\s+(?:\S.*?|[\t\v\f \xA0\u1680\u2000-\u200A\u202F\u205F\u3000\uFEFF]):\s*"([\s\S]+)"\.?$/i)

  if (quotedCaptionMatch)
    return quotedCaptionMatch[1].trim()

  return caption
}

function decodeHtmlEntities(value: string): string {
  const textarea = document.createElement('textarea')
  textarea.innerHTML = value
  return textarea.value
}

function parseHtmlDocument(html: string): Document {
  return new DOMParser().parseFromString(html, 'text/html')
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
