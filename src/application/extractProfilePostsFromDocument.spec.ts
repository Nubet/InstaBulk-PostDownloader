import { describe, expect, it } from 'vitest'
import { extractProfilePostsFromDocument } from './extractProfilePostsFromDocument'

describe('extractProfilePostsFromDocument', () => {
  it('extracts unique posts from profile anchors', () => {
    document.body.innerHTML = `
      <main>
        <a href="/p/post-1/">
          <img src="https://cdn.example.com/post-1.jpg" alt="First caption" />
        </a>
        <a href="/p/post-2/">
          <img src="https://cdn.example.com/post-2.jpg" alt="Second caption" />
        </a>
        <a href="/p/post-1/">
          <img src="https://cdn.example.com/post-1-duplicate.jpg" alt="Duplicate" />
        </a>
      </main>
    `

    expect(extractProfilePostsFromDocument(document, 'nubet')).toEqual({
      seenPostIds: new Set(['post-1', 'post-2']),
      posts: [
        {
          id: 'post-1',
          imageUrl: 'https://cdn.example.com/post-1.jpg',
          caption: 'First caption',
          profileName: 'nubet',
        },
        {
          id: 'post-2',
          imageUrl: 'https://cdn.example.com/post-2.jpg',
          caption: 'Second caption',
          profileName: 'nubet',
        },
      ],
    })
  })

  it('ignores already seen posts and non-post links', () => {
    document.body.innerHTML = `
      <main>
        <a href="/explore/">
          <img src="https://cdn.example.com/explore.jpg" alt="Ignore" />
        </a>
        <a href="/reel/post-3/">
          <img src="https://cdn.example.com/post-3.jpg" alt="Third caption" />
        </a>
      </main>
    `

    expect(extractProfilePostsFromDocument(document, 'nubet', ['post-3'])).toEqual({
      seenPostIds: new Set(['post-3']),
      posts: [],
    })
  })
})
