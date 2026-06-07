const RESERVED_INSTAGRAM_PATHS = new Set([
  'accounts',
  'direct',
  'explore',
  'p',
  'reel',
  'reels',
  'stories',
])

export type InstagramProfileValidation =
  | { valid: true, url: string, profileName: string }
  | { valid: false, reason: string }

export function validateInstagramProfileUrl(value: string | undefined): InstagramProfileValidation {
  if (!value)
    return { valid: false, reason: 'Open a public Instagram profile first.' }

  let url: URL

  try {
    url = new URL(value)
  }
  catch {
    return { valid: false, reason: 'Active tab URL is not valid.' }
  }

  if (url.hostname !== 'www.instagram.com')
    return { valid: false, reason: 'Active tab must be on www.instagram.com.' }

  const segments = url.pathname.split('/').filter(Boolean)
  const [profileName] = segments

  if (!profileName || segments.length !== 1 || RESERVED_INSTAGRAM_PATHS.has(profileName))
    return { valid: false, reason: 'Open an Instagram profile page, not a post, reel, story, or feed page.' }

  return {
    valid: true,
    url: url.toString(),
    profileName,
  }
}
