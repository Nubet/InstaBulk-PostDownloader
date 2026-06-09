import { describe, expect, it } from 'vitest'
import { validateInstagramProfileUrl } from '~/features/profileDownload/domain/profileDownload'

describe('validateInstagramProfileUrl', () => {
  it('accepts Instagram profile URLs', () => {
    expect(validateInstagramProfileUrl('https://www.instagram.com/nubet/')).toEqual({
      valid: true,
      profileUrl: 'https://www.instagram.com/nubet/',
      profileName: 'nubet',
    })
  })

  it('rejects non-profile Instagram paths', () => {
    expect(validateInstagramProfileUrl('https://www.instagram.com/p/example/')).toEqual({
      valid: false,
      reason: 'Open an Instagram profile page, not a post, reel, story, or feed page.',
    })
  })
})
