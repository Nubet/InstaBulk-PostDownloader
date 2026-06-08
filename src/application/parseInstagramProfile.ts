import { sanitizePathSegment } from './sanitizePathSegment'
import type { InstagramProfile } from '~/domain/download'

export function parseInstagramProfile(profileUrl: string): InstagramProfile {
  const url = new URL(profileUrl)
  const [profileName] = url.pathname.split('/').filter(Boolean)

  if (!profileName)
    throw new Error('Instagram profile URL must include a profile name.')

  return {
    name: profileName,
    url: url.toString(),
    targetRoot: sanitizePathSegment(profileName),
  }
}
