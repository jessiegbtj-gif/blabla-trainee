export interface Env {
  DB: D1Database
  ASSETS: Fetcher
}

export interface AuthedVars {
  userId: string
  username: string
}
