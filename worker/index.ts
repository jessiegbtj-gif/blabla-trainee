import { Hono, type Context, type Next } from 'hono'
import { cors } from 'hono/cors'
import type { Env, AuthedVars } from './types'
import { hashPassword, verifyPassword, randomToken, newUserId, validUsername, validPassword } from './auth'

type Vars = Partial<AuthedVars>
type AppEnv = { Bindings: Env; Variables: Vars }
const app = new Hono<AppEnv>()

app.use('/api/*', cors())

// ---------- auth middleware ----------
async function requireAuth(c: Context<AppEnv>, next: Next) {
  const header = c.req.header('Authorization') || ''
  const token = header.startsWith('Bearer ') ? header.slice(7) : ''
  if (!token) return c.json({ error: 'unauthorized' }, 401)
  const row = await c.env.DB.prepare(
    'SELECT sessions.user_id as userId, users.username as username FROM sessions JOIN users ON users.id = sessions.user_id WHERE sessions.token = ?',
  )
    .bind(token)
    .first<{ userId: string; username: string }>()
  if (!row) return c.json({ error: 'unauthorized' }, 401)
  c.set('userId', row.userId)
  c.set('username', row.username)
  await next()
}

// ---------- auth routes ----------
app.post('/api/register', async (c) => {
  const body = await c.req.json().catch(() => ({}))
  const username = String(body.username || '').trim()
  const password = String(body.password || '')
  if (!validUsername(username)) {
    return c.json({ error: '用户名需为2-20位中英文/数字/下划线' }, 400)
  }
  if (!validPassword(password)) {
    return c.json({ error: '密码至少6位' }, 400)
  }
  const existing = await c.env.DB.prepare('SELECT id FROM users WHERE username = ?').bind(username).first()
  if (existing) return c.json({ error: '用户名已被占用' }, 409)

  const { hash, salt } = await hashPassword(password)
  const id = newUserId()
  const now = new Date().toISOString()
  await c.env.DB.prepare('INSERT INTO users (id, username, password_hash, salt, created_at) VALUES (?, ?, ?, ?, ?)')
    .bind(id, username, hash, salt, now)
    .run()
  const token = randomToken()
  await c.env.DB.prepare('INSERT INTO sessions (token, user_id, created_at) VALUES (?, ?, ?)').bind(token, id, now).run()
  return c.json({ token, username })
})

app.post('/api/login', async (c) => {
  const body = await c.req.json().catch(() => ({}))
  const username = String(body.username || '').trim()
  const password = String(body.password || '')
  const user = await c.env.DB.prepare('SELECT id, username, password_hash, salt FROM users WHERE username = ?')
    .bind(username)
    .first<{ id: string; username: string; password_hash: string; salt: string }>()
  if (!user) return c.json({ error: '用户名或密码不正确' }, 401)
  const ok = await verifyPassword(password, user.salt, user.password_hash)
  if (!ok) return c.json({ error: '用户名或密码不正确' }, 401)
  const token = randomToken()
  await c.env.DB.prepare('INSERT INTO sessions (token, user_id, created_at) VALUES (?, ?, ?)')
    .bind(token, user.id, new Date().toISOString())
    .run()
  return c.json({ token, username: user.username })
})

app.post('/api/logout', requireAuth, async (c) => {
  const header = c.req.header('Authorization') || ''
  const token = header.startsWith('Bearer ') ? header.slice(7) : ''
  if (token) await c.env.DB.prepare('DELETE FROM sessions WHERE token = ?').bind(token).run()
  return c.json({ ok: true })
})

app.get('/api/me', requireAuth, async (c) => {
  return c.json({ id: c.get('userId'), username: c.get('username') })
})

// ---------- questions (shared) ----------
app.get('/api/questions', requireAuth, async (c) => {
  const { results } = await c.env.DB.prepare(
    'SELECT id, type, subtype, sentences, vocab, notes, source, created_at as createdAt FROM questions ORDER BY created_at DESC LIMIT 1000',
  ).all()
  const questions = (results || []).map((r: any) => ({
    id: r.id,
    type: r.type,
    subtype: r.subtype,
    sentences: JSON.parse(r.sentences),
    vocab: JSON.parse(r.vocab),
    notes: r.notes,
    source: r.source,
    createdAt: r.createdAt,
  }))
  return c.json({ questions })
})

app.post('/api/questions', requireAuth, async (c) => {
  const body = await c.req.json().catch(() => ({}))
  const type = body.type === 'listening' ? 'listening' : 'speaking'
  const subtype = String(body.subtype || '')
  const sentences = Array.isArray(body.sentences) ? body.sentences : []
  const vocab = Array.isArray(body.vocab) ? body.vocab : []
  const notes = String(body.notes || '')
  const source = String(body.source || 'manual')
  if (!sentences.length) return c.json({ error: '至少需要一句原文' }, 400)
  const id = 'q_' + randomToken(8)
  const now = new Date().toISOString()
  await c.env.DB.prepare(
    'INSERT INTO questions (id, type, subtype, sentences, vocab, notes, source, created_by, created_at) VALUES (?,?,?,?,?,?,?,?,?)',
  )
    .bind(id, type, subtype, JSON.stringify(sentences), JSON.stringify(vocab), notes, source, c.get('userId'), now)
    .run()
  return c.json({ id, createdAt: now })
})

app.patch('/api/questions/:id/vocab', requireAuth, async (c) => {
  const id = c.req.param('id')
  const body = await c.req.json().catch(() => ({}))
  const vocab = Array.isArray(body.vocab) ? body.vocab : []
  await c.env.DB.prepare('UPDATE questions SET vocab = ? WHERE id = ?').bind(JSON.stringify(vocab), id).run()
  return c.json({ ok: true })
})

app.delete('/api/questions/:id', requireAuth, async (c) => {
  const id = c.req.param('id')
  await c.env.DB.batch([
    c.env.DB.prepare('DELETE FROM progress WHERE question_id = ?').bind(id),
    c.env.DB.prepare('DELETE FROM vocab_srs WHERE question_id = ?').bind(id),
    c.env.DB.prepare('DELETE FROM questions WHERE id = ?').bind(id),
  ])
  return c.json({ ok: true })
})

// ---------- progress (per-user) ----------
app.get('/api/progress', requireAuth, async (c) => {
  const { results } = await c.env.DB.prepare(
    'SELECT question_id as questionId, studied_count as studiedCount, correct_count as correctCount, wrong_count as wrongCount, mastered, flagged, last_studied_at as lastStudiedAt FROM progress WHERE user_id = ?',
  )
    .bind(c.get('userId'))
    .all()
  const map: Record<string, any> = {}
  for (const r of (results || []) as any[]) {
    map[r.questionId] = {
      studiedCount: r.studiedCount,
      correctCount: r.correctCount,
      wrongCount: r.wrongCount,
      mastered: !!r.mastered,
      flagged: !!r.flagged,
      lastStudiedAt: r.lastStudiedAt,
    }
  }
  return c.json({ progress: map })
})

app.put('/api/progress/:qid', requireAuth, async (c) => {
  const qid = c.req.param('qid')
  const body = await c.req.json().catch(() => ({}))
  const userId = c.get('userId')!
  const existing = await c.env.DB.prepare('SELECT * FROM progress WHERE user_id = ? AND question_id = ?')
    .bind(userId, qid)
    .first<any>()
  const merged = {
    studiedCount: body.studiedCount ?? existing?.studied_count ?? 0,
    correctCount: body.correctCount ?? existing?.correct_count ?? 0,
    wrongCount: body.wrongCount ?? existing?.wrong_count ?? 0,
    mastered: body.mastered ?? !!existing?.mastered,
    flagged: body.flagged ?? !!existing?.flagged,
    lastStudiedAt: body.lastStudiedAt ?? existing?.last_studied_at ?? null,
  }
  await c.env.DB.prepare(
    `INSERT INTO progress (user_id, question_id, studied_count, correct_count, wrong_count, mastered, flagged, last_studied_at)
     VALUES (?,?,?,?,?,?,?,?)
     ON CONFLICT(user_id, question_id) DO UPDATE SET
       studied_count=excluded.studied_count, correct_count=excluded.correct_count, wrong_count=excluded.wrong_count,
       mastered=excluded.mastered, flagged=excluded.flagged, last_studied_at=excluded.last_studied_at`,
  )
    .bind(
      userId,
      qid,
      merged.studiedCount,
      merged.correctCount,
      merged.wrongCount,
      merged.mastered ? 1 : 0,
      merged.flagged ? 1 : 0,
      merged.lastStudiedAt,
    )
    .run()
  return c.json({ ok: true })
})

// ---------- vocab SRS (per-user, Leitner spaced repetition) ----------
app.get('/api/vocab-srs', requireAuth, async (c) => {
  const { results } = await c.env.DB.prepare(
    'SELECT question_id as questionId, vid, box, reviews, next_review as nextReview FROM vocab_srs WHERE user_id = ?',
  )
    .bind(c.get('userId'))
    .all()
  return c.json({ items: results || [] })
})

app.put('/api/vocab-srs', requireAuth, async (c) => {
  const body = await c.req.json().catch(() => ({}))
  const { qid, vid, box, reviews, nextReview } = body
  if (!qid || !vid) return c.json({ error: 'qid and vid required' }, 400)
  await c.env.DB.prepare(
    `INSERT INTO vocab_srs (user_id, question_id, vid, box, reviews, next_review)
     VALUES (?,?,?,?,?,?)
     ON CONFLICT(user_id, question_id, vid) DO UPDATE SET
       box=excluded.box, reviews=excluded.reviews, next_review=excluded.next_review`,
  )
    .bind(c.get('userId'), qid, vid, Number(box) || 1, Number(reviews) || 0, nextReview || null)
    .run()
  return c.json({ ok: true })
})

// ---------- standalone vocab bank (per-user) ----------
app.get('/api/vocab-bank', requireAuth, async (c) => {
  const { results } = await c.env.DB.prepare(
    'SELECT id, term, zh, created_at as createdAt FROM vocab_bank WHERE user_id = ? ORDER BY created_at DESC',
  )
    .bind(c.get('userId'))
    .all()
  return c.json({ items: results || [] })
})

app.post('/api/vocab-bank', requireAuth, async (c) => {
  const body = await c.req.json().catch(() => ({}))
  const term = String(body.term || '').trim()
  if (!term) return c.json({ error: 'term required' }, 400)
  const id = 'v_' + randomToken(8)
  const now = new Date().toISOString()
  await c.env.DB.prepare('INSERT INTO vocab_bank (id, user_id, term, zh, created_at) VALUES (?,?,?,?,?)')
    .bind(id, c.get('userId'), term, String(body.zh || ''), now)
    .run()
  return c.json({ id, createdAt: now })
})

app.delete('/api/vocab-bank/:id', requireAuth, async (c) => {
  await c.env.DB.prepare('DELETE FROM vocab_bank WHERE id = ? AND user_id = ?').bind(c.req.param('id'), c.get('userId')).run()
  return c.json({ ok: true })
})

// ---------- mock test history (per-user) ----------
app.get('/api/tests', requireAuth, async (c) => {
  const { results } = await c.env.DB.prepare(
    'SELECT id, type_filter as typeFilter, count, score_pct as scorePct, ratings, completed_at as completedAt FROM tests WHERE user_id = ? ORDER BY completed_at DESC LIMIT 200',
  )
    .bind(c.get('userId'))
    .all()
  const tests = (results || []).map((r: any) => ({ ...r, ratings: JSON.parse(r.ratings) }))
  return c.json({ tests })
})

app.post('/api/tests', requireAuth, async (c) => {
  const body = await c.req.json().catch(() => ({}))
  const id = 't_' + randomToken(8)
  const now = new Date().toISOString()
  await c.env.DB.prepare(
    'INSERT INTO tests (id, user_id, type_filter, count, score_pct, ratings, completed_at) VALUES (?,?,?,?,?,?,?)',
  )
    .bind(
      id,
      c.get('userId'),
      String(body.typeFilter || 'all'),
      Number(body.count) || 0,
      Number(body.scorePct) || 0,
      JSON.stringify(body.ratings || []),
      now,
    )
    .run()
  return c.json({ id, completedAt: now })
})

app.get('/api/health', (c) => c.json({ ok: true }))

// Anything else under /api/* that didn't match is a 404, not the SPA.
app.all('/api/*', (c) => c.json({ error: 'not found' }, 404))

// Everything else: serve the built static frontend.
app.get('*', (c) => c.env.ASSETS.fetch(c.req.raw))

export default app
