import { describe, expect, it } from 'vitest'
import { getRandomDelay } from '~/features/profileDownload/domain/scrapePolicy'

describe('getRandomDelay', () => {
  it('returns the lower bound for random 0', () => {
    expect(getRandomDelay(2000, 5500, () => 0)).toBe(2000)
  })

  it('returns the upper bound for random 1', () => {
    expect(getRandomDelay(2000, 5500, () => 1)).toBe(5500)
  })
})
