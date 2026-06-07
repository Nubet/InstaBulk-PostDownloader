import type { ProtocolWithReturn } from 'webext-bridge'
import type { StartProfileDownloadRequest, StartProfileDownloadResponse } from './src/shared/messages'

declare module 'webext-bridge' {
  export interface ProtocolMap {
    'start-profile-download': ProtocolWithReturn<StartProfileDownloadRequest, StartProfileDownloadResponse>
  }
}
