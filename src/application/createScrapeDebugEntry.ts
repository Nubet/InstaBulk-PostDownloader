import type { ScrapeDebugEntry } from '~/domain/download'

let nextDebugEntryId = 0

export function createScrapeDebugEntry(
  level: ScrapeDebugEntry['level'],
  scope: ScrapeDebugEntry['scope'],
  message: string,
  details?: string,
): ScrapeDebugEntry {
  nextDebugEntryId += 1

  return {
    id: `debug-${nextDebugEntryId}`,
    timestamp: new Date().toISOString(),
    level,
    scope,
    message,
    details,
  }
}
