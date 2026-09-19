// Thin fetch wrapper. Base URL is empty because the frontend is served from
// the same Worker/domain as the API (no CORS needed in production); during
// `npm run dev` we proxy /api to the local wrangler dev server (see vite.config).
const TOKEN_KEY = 'pte_trainee_token'
const USERNAME_KEY = 'pte_trainee_username'

export function getToken(): string | null {
  return localStorage.getItem(TOKEN_KEY)
}
export function getStoredUsername(): string | null {
  return localStorage.getItem(USERNAME_KEY)
}
export function setSession(token: string, username: string) {
  localStorage.setItem(TOKEN_KEY, token)
  localStorage.setItem(USERNAME_KEY, username)
}
export function clearSession() {
  localStorage.removeItem(TOKEN_KEY)
  localStorage.removeItem(USERNAME_KEY)
}

export class ApiError extends Error {
  status: number
  constructor(status: number, message: string) {
    super(message)
    this.status = status
  }
}

async function request<T>(path: string, opts: RequestInit = {}): Promise<T> {
  const token = getToken()
  const headers: Record<string, string> = { ...(opts.headers as Record<string, string>) }
  if (opts.body) headers['Content-Type'] = 'application/json'
  if (token) headers['Authorization'] = 'Bearer ' + token

  const res = await fetch('/api' + path, { ...opts, headers })
  let data: any = null
  try {
    data = await res.json()
  } catch {
    /* no body */
  }
  if (!res.ok) {
    if (res.status === 401) clearSession()
    throw new ApiError(res.status, (data && data.error) || `请求失败 (${res.status})`)
  }
  return data as T
}

export const api = {
  register: (username: string, password: string) =>
    request<{ token: string; username: string }>('/register', { method: 'POST', body: JSON.stringify({ username, password }) }),
  login: (username: string, password: string) =>
    request<{ token: string; username: string }>('/login', { method: 'POST', body: JSON.stringify({ username, password }) }),
  logout: () => request<{ ok: true }>('/logout', { method: 'POST' }),
  me: () => request<{ id: string; username: string }>('/me'),

  listQuestions: () => request<{ questions: import('./types').Question[] }>('/questions'),
  addQuestion: (payload: Partial<import('./types').Question>) =>
    request<{ id: string; createdAt: string }>('/questions', { method: 'POST', body: JSON.stringify(payload) }),
  updateQuestionVocab: (id: string, vocab: import('./types').VocabItem[]) =>
    request<{ ok: true }>(`/questions/${id}/vocab`, { method: 'PATCH', body: JSON.stringify({ vocab }) }),
  deleteQuestion: (id: string) => request<{ ok: true }>(`/questions/${id}`, { method: 'DELETE' }),

  getProgress: () => request<{ progress: import('./types').ProgressMap }>('/progress'),
  putProgress: (qid: string, patch: Partial<import('./types').Progress>) =>
    request<{ ok: true }>(`/progress/${qid}`, { method: 'PUT', body: JSON.stringify(patch) }),

  getVocabSrs: () => request<{ items: import('./types').VocabSrsItem[] }>('/vocab-srs'),
  putVocabSrs: (item: { qid: string; vid: string; box: number; reviews: number; nextReview: string | null }) =>
    request<{ ok: true }>('/vocab-srs', { method: 'PUT', body: JSON.stringify(item) }),

  getVocabBank: () => request<{ items: import('./types').StandaloneVocab[] }>('/vocab-bank'),
  addVocabBank: (term: string, zh: string) =>
    request<{ id: string; createdAt: string }>('/vocab-bank', { method: 'POST', body: JSON.stringify({ term, zh }) }),
  deleteVocabBank: (id: string) => request<{ ok: true }>(`/vocab-bank/${id}`, { method: 'DELETE' }),

  getTests: () => request<{ tests: import('./types').TestResult[] }>('/tests'),
  addTest: (payload: { typeFilter: string; count: number; scorePct: number; ratings: import('./types').TestRating[] }) =>
    request<{ id: string; completedAt: string }>('/tests', { method: 'POST', body: JSON.stringify(payload) }),
}
