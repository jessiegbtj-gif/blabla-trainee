export interface Env {
  DB: D1Database
  ASSETS: Fetcher
  TTS_CACHE: R2Bucket
  AZURE_TTS_KEY: string
  AZURE_TTS_REGION: string
}

export interface AuthedVars {
  userId: string
  username: string
}
