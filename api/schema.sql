-- PISA Simulator leaderboard schema (Neon Postgres / serverless Postgres)
-- Run once against the production database, then set DATABASE_URL on Vercel.

CREATE TABLE IF NOT EXISTS leaderboard_entries (
  id          UUID PRIMARY KEY,
  name        TEXT NOT NULL CHECK (char_length(name) BETWEEN 1 AND 40),
  mode        TEXT NOT NULL CHECK (mode IN ('full', 'standard', 'quick')),
  score       INTEGER NOT NULL CHECK (score BETWEEN 200 AND 800),
  session_id  TEXT NOT NULL UNIQUE,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS leaderboard_mode_score_idx
  ON leaderboard_entries (mode, score DESC, created_at ASC);
