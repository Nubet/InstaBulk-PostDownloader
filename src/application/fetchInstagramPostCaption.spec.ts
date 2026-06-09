import { afterEach, describe, expect, it, vi } from 'vitest'
import { fetchInstagramPostCaption } from '~/features/profileDownload/infrastructure/fetchInstagramPostCaption'

describe('fetchInstagramPostCaption', () => {
  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('decodes HTML entities from the post page fallback caption', async () => {
    const fetchMock = vi.fn()
      .mockResolvedValueOnce({
        ok: false,
        status: 500,
      })
      .mockResolvedValueOnce({
        ok: true,
        text: async () => '<meta property="og:description" content="30 likes, 6 comments - norbert_fila on January 9, 2025: &quot;Praga&#x1f1e8;&#x1f1ff;&quot;." />',
      })

    vi.stubGlobal('fetch', fetchMock)

    await expect(fetchInstagramPostCaption('post-1')).resolves.toBe('Praga🇨🇿')
  })

  it('extracts and decodes authored caption from og:description fallback', async () => {
    const fetchMock = vi.fn()
      .mockResolvedValueOnce({
        ok: false,
        status: 500,
      })
      .mockResolvedValueOnce({
        ok: true,
        text: async () => '<meta property="og:description" content="36 likes, 18 comments - norbert_fila on August 7, 2023: &quot;Dzi&#x119;ki panowie za wsp&#xf3;lny wyjazd, Kochamy ci&#x119; Frank&quot;." />',
      })

    vi.stubGlobal('fetch', fetchMock)

    await expect(fetchInstagramPostCaption('post-2')).resolves.toBe('Dzięki panowie za wspólny wyjazd, Kochamy cię Frank')
  })

  it('sanitizes instagram summary text returned directly by graphql', async () => {
    const fetchMock = vi.fn()
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          data: {
            shortcode_media: {
              edge_media_to_caption: {
                edges: [
                  {
                    node: {
                      text: '36 likes, 18 comments - norbert_fila on August 7, 2023: &quot;Dzi&#x119;ki panowie za wsp&#xf3;lny wyjazd, Kochamy ci&#x119; Frank&quot;.',
                    },
                  },
                ],
              },
            },
          },
        }),
      })

    vi.stubGlobal('fetch', fetchMock)

    await expect(fetchInstagramPostCaption('post-3')).resolves.toBe('Dzięki panowie za wspólny wyjazd, Kochamy cię Frank')
  })
})
