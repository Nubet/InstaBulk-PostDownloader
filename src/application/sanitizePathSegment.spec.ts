import { describe, expect, it } from 'vitest'
import { sanitizePathSegment } from '~/features/profileDownload/domain/profileDownload'

describe('sanitizePathSegment', () => {
  it('replaces forbidden file path characters', () => {
    expect(sanitizePathSegment(' profile:one/two? ')).toBe('profile_one_two_')
  })
})
