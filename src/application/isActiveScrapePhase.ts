import type { ScrapePhase } from '~/domain/download'

const activePhases: ScrapePhase[] = ['starting', 'scraping', 'cooldown', 'saving']

export function isActiveScrapePhase(phase: ScrapePhase): boolean {
  return activePhases.includes(phase)
}
