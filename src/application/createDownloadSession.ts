import type { InstagramProfile } from '~/domain/instagramProfile'

export interface DownloadSession {
  profileName: string
  profileUrl: string
  targetRoot: string
}

export function createDownloadSession(profileUrl: string): DownloadSession {
  const profile = parseInstagramProfile(profileUrl)

  return {
    profileName: profile.name,
    profileUrl: profile.url,
    targetRoot: sanitizePathSegment(profile.name),
  }
}

function parseInstagramProfile(profileUrl: string): InstagramProfile {
  const url = new URL(profileUrl)
  const [profileName] = url.pathname.split('/').filter(Boolean)

  return {
    name: profileName,
    url: url.toString(),
  }
}

function sanitizePathSegment(value: string) {
  return value.replace(/[<>:"/\\|?*]+/g, '_')
}
