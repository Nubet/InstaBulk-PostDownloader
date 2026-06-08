export function getRandomDelay(minMs: number, maxMs: number, random = Math.random): number {
  if (maxMs < minMs)
    throw new Error('maxMs must be greater than or equal to minMs.')

  const range = maxMs - minMs

  return minMs + Math.round(random() * range)
}
