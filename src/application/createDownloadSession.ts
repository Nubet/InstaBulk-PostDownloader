import { parseInstagramProfile } from './parseInstagramProfile'
import type { DownloadSession } from '~/domain/download'

export function createDownloadSession(profileUrl: string): DownloadSession {
  const profile = parseInstagramProfile(profileUrl)

  return {
    id: crypto.randomUUID(),
    profile,
    startedAt: new Date().toISOString(),
  }
}
