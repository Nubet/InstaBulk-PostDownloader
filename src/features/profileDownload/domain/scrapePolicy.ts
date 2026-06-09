export interface DelayRange {
  min: number
  max: number
}

export const profileScrapePolicy = {
  scrollDelayRange: { min: 2000, max: 5500 },
  cooldownDelayRange: { min: 60000, max: 120000 },
  maxAttemptsWithoutNewPosts: 3,
  cooldownBatchSize: 30,
  hydrationAttempts: 5,
  hydrationDelayMs: 800,
  postScrollSettleDelayMs: 1200,
  captionRequestDelayMs: 300,
  debugLogLimit: 120,
  enableEndOfProfileRetries: false,
} as const

export function getRandomDelay(minMs: number, maxMs: number, random = Math.random): number {
  if (maxMs < minMs)
    throw new Error('maxMs must be greater than or equal to minMs.')

  const range = maxMs - minMs

  return minMs + Math.round(random() * range)
}

export function shouldApplyBatchCooldown(discoveredPostCount: number, previousCooldownPostCount: number, batchSize: number): boolean {
  if (batchSize <= 0)
    return false

  const currentBatchCount = Math.floor(discoveredPostCount / batchSize)
  const previousBatchCount = Math.floor(previousCooldownPostCount / batchSize)

  return currentBatchCount > previousBatchCount
}

export function hasReachedProfileEnd(attemptsWithoutNewPosts: number, maxAttemptsWithoutNewPosts: number): boolean {
  return attemptsWithoutNewPosts >= maxAttemptsWithoutNewPosts
}
