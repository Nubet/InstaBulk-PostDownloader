export interface GraphQLResponse {
  data?: {
    shortcode_media?: {
      edge_media_to_caption?: {
        edges?: {
          node?: {
            text?: string
          }
        }[]
      }
      caption?: string
    }
  }
}

export interface PostPageData {
  caption?: string
}
