-- PTE 陪练 — D1 schema
-- Run with: npx wrangler d1 execute pte_trainee --file=worker/migrations/0001_init.sql [--remote]

CREATE TABLE IF NOT EXISTS users (
  id            TEXT PRIMARY KEY,
  username      TEXT NOT NULL UNIQUE,
  password_hash TEXT NOT NULL,
  salt          TEXT NOT NULL,
  created_at    TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS sessions (
  token      TEXT PRIMARY KEY,
  user_id    TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  created_at TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_sessions_user ON sessions(user_id);

-- Shared question bank: every signed-in user reads and can contribute to the same pool.
CREATE TABLE IF NOT EXISTS questions (
  id          TEXT PRIMARY KEY,
  type        TEXT NOT NULL,               -- 'speaking' | 'listening'
  subtype     TEXT NOT NULL DEFAULT '',
  sentences   TEXT NOT NULL,               -- JSON array [{en, zh}]
  vocab       TEXT NOT NULL,               -- JSON array [{vid, term, zh, addedBy}]
  notes       TEXT NOT NULL DEFAULT '',
  source      TEXT NOT NULL DEFAULT 'manual',
  created_by  TEXT NOT NULL REFERENCES users(id),
  created_at  TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_questions_created_at ON questions(created_at DESC);

-- Per-user study progress on a shared question.
CREATE TABLE IF NOT EXISTS progress (
  user_id        TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  question_id    TEXT NOT NULL REFERENCES questions(id) ON DELETE CASCADE,
  studied_count  INTEGER NOT NULL DEFAULT 0,
  correct_count  INTEGER NOT NULL DEFAULT 0,
  wrong_count    INTEGER NOT NULL DEFAULT 0,
  mastered       INTEGER NOT NULL DEFAULT 0,  -- 0/1
  flagged        INTEGER NOT NULL DEFAULT 0,  -- 0/1
  last_studied_at TEXT,
  PRIMARY KEY (user_id, question_id)
);

-- Per-user Leitner spaced-repetition state for one vocab item (qid + vid).
CREATE TABLE IF NOT EXISTS vocab_srs (
  user_id      TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  question_id  TEXT NOT NULL,
  vid          TEXT NOT NULL,
  box          INTEGER NOT NULL DEFAULT 1,
  reviews      INTEGER NOT NULL DEFAULT 0,
  next_review  TEXT,
  PRIMARY KEY (user_id, question_id, vid)
);

-- Per-user standalone vocab (not tied to any question).
CREATE TABLE IF NOT EXISTS vocab_bank (
  id         TEXT PRIMARY KEY,
  user_id    TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  term       TEXT NOT NULL,
  zh         TEXT NOT NULL DEFAULT '',
  created_at TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_vocab_bank_user ON vocab_bank(user_id);

-- Per-user mock test history.
CREATE TABLE IF NOT EXISTS tests (
  id            TEXT PRIMARY KEY,
  user_id       TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  type_filter   TEXT NOT NULL DEFAULT 'all',
  count         INTEGER NOT NULL DEFAULT 0,
  score_pct     INTEGER NOT NULL DEFAULT 0,
  ratings       TEXT NOT NULL,             -- JSON array [{qid, rating}]
  completed_at  TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_tests_user ON tests(user_id, completed_at DESC);
