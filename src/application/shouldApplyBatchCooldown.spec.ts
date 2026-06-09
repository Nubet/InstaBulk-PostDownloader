import { describe, expect, it } from 'vitest'
import { shouldApplyBatchCooldown } from '~/features/profileDownload/domain/scrapePolicy'

describe('shouldApplyBatchCooldown', () => {
  it('returns true when a new batch threshold is crossed', () => {
    expect(shouldApplyBatchCooldown(30, 0, 30)).toBe(true)
  })

  it('returns false within the same batch', () => {
    expect(shouldApplyBatchCooldown(31, 30, 30)).toBe(false)
  })
})
