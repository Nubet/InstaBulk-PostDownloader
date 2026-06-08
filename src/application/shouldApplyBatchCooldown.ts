export function shouldApplyBatchCooldown(discoveredPostCount: number, previousCooldownPostCount: number, batchSize: number): boolean {
  if (batchSize <= 0)
    return false

  const currentBatchCount = Math.floor(discoveredPostCount / batchSize)
  const previousBatchCount = Math.floor(previousCooldownPostCount / batchSize)

  return currentBatchCount > previousBatchCount
}
