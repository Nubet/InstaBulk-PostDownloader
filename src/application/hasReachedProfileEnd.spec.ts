import { describe, expect, it } from 'vitest'
import { hasReachedProfileEnd } from '~/features/profileDownload/domain/scrapePolicy'

describe('hasReachedProfileEnd', () => {
  it('returns false before the threshold', () => {
    expect(hasReachedProfileEnd(2, 3)).toBe(false)
  })

  it('returns true at the threshold', () => {
    expect(hasReachedProfileEnd(3, 3)).toBe(true)
  })
})
