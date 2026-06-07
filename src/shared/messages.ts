export interface StartProfileDownloadRequest {
  profileUrl: string
}

export interface StartProfileDownloadResponse {
  accepted: boolean
  message: string
}
