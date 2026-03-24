-- ============================================================
-- Mines Game — Supabase Schema
-- ============================================================

-- Game sessions
CREATE TABLE IF NOT EXISTS game_sessions (
  id                   UUID PRIMARY KEY,
  user_id              UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  bet                  NUMERIC(12, 2) NOT NULL,
  grid_size            INT NOT NULL CHECK (grid_size IN (9, 25, 49, 100)),
  mine_count           INT NOT NULL,
  server_seed          TEXT NOT NULL,          -- stored server-side; revealed after cashout
  server_seed_revealed TEXT,                   -- populated when game ends (provably fair)
  server_seed_hash     TEXT NOT NULL,          -- shown to player BEFORE game starts
  client_seed          TEXT NOT NULL,
  nonce                INT NOT NULL DEFAULT 1,
  mine_positions       INT[] NOT NULL,         -- resolved positions (hidden from client during play)
  special_tiles        JSONB,                  -- [{index, type}, ...]
  status               TEXT NOT NULL CHECK (status IN ('active', 'won', 'lost')) DEFAULT 'active',
  revealed_safe        INT NOT NULL DEFAULT 0,
  current_multiplier   NUMERIC(12, 6) NOT NULL DEFAULT 1.0,
  cashout_multiplier   NUMERIC(12, 6),
  winnings             NUMERIC(12, 2),
  shield_active        BOOLEAN NOT NULL DEFAULT FALSE,
  house_edge           NUMERIC(6, 4) NOT NULL DEFAULT 0.01,
  created_at           TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  finished_at          TIMESTAMPTZ
);

-- Tile reveals log
CREATE TABLE IF NOT EXISTS tile_reveals (
  id           BIGSERIAL PRIMARY KEY,
  session_id   UUID NOT NULL REFERENCES game_sessions(id) ON DELETE CASCADE,
  tile_index   INT NOT NULL,
  tile_type    TEXT NOT NULL DEFAULT 'safe',
  revealed_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Leaderboard view (top cashouts by multiplier today)
CREATE OR REPLACE VIEW leaderboard_today AS
SELECT
  gs.user_id,
  gs.cashout_multiplier,
  gs.bet,
  gs.winnings,
  gs.grid_size,
  gs.mine_count,
  gs.finished_at
FROM game_sessions gs
WHERE gs.status = 'won'
  AND gs.finished_at >= NOW() - INTERVAL '24 hours'
ORDER BY gs.cashout_multiplier DESC
LIMIT 50;

-- ============================================================
-- Row Level Security
-- ============================================================

ALTER TABLE game_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE tile_reveals ENABLE ROW LEVEL SECURITY;

-- Users can only see their own sessions
CREATE POLICY "Users can view own sessions"
  ON game_sessions FOR SELECT
  USING (auth.uid() = user_id);

-- Service role bypasses RLS (used by API routes via service client)
-- (No additional policy needed; service role key bypasses RLS automatically)

-- Tile reveals: users can view their own
CREATE POLICY "Users can view own tile reveals"
  ON tile_reveals FOR SELECT
  USING (
    session_id IN (
      SELECT id FROM game_sessions WHERE user_id = auth.uid()
    )
  );
