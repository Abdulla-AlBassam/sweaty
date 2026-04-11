-- RAWG enrichment columns on games_cache + generic rawg_cache table
-- Adds fields consumed by GameDetailScreen (playtime, Metacritic, ESRB, stores, game modes, exact release date)
-- and a JSONB cache table for reusable RAWG responses (stores, screenshots, series, achievements, etc).

-- Extend games_cache with RAWG enrichment columns
ALTER TABLE games_cache
  ADD COLUMN IF NOT EXISTS rawg_id INTEGER,
  ADD COLUMN IF NOT EXISTS rawg_slug TEXT,
  ADD COLUMN IF NOT EXISTS metacritic INTEGER,
  ADD COLUMN IF NOT EXISTS playtime_hours INTEGER,
  ADD COLUMN IF NOT EXISTS rawg_released DATE,
  ADD COLUMN IF NOT EXISTS esrb_rating TEXT,
  ADD COLUMN IF NOT EXISTS game_modes TEXT[],
  ADD COLUMN IF NOT EXISTS stores JSONB,
  ADD COLUMN IF NOT EXISTS rawg_fetched_at TIMESTAMPTZ;

CREATE INDEX IF NOT EXISTS idx_games_cache_rawg_fetched_at
  ON games_cache(rawg_fetched_at);

-- Generic RAWG response cache (used by list endpoints, stores sub-route, series, etc)
CREATE TABLE IF NOT EXISTS rawg_cache (
  cache_key TEXT PRIMARY KEY,
  data JSONB NOT NULL,
  fetched_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  expires_at TIMESTAMPTZ NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_rawg_cache_expires_at
  ON rawg_cache(expires_at);

ALTER TABLE rawg_cache ENABLE ROW LEVEL SECURITY;

-- Low-sensitivity cache of public RAWG data. Public read and public write so
-- the API route can upsert via the anon client without needing the service role.
DROP POLICY IF EXISTS rawg_cache_read ON rawg_cache;
CREATE POLICY rawg_cache_read ON rawg_cache
  FOR SELECT USING (true);

DROP POLICY IF EXISTS rawg_cache_insert ON rawg_cache;
CREATE POLICY rawg_cache_insert ON rawg_cache
  FOR INSERT WITH CHECK (true);

DROP POLICY IF EXISTS rawg_cache_update ON rawg_cache;
CREATE POLICY rawg_cache_update ON rawg_cache
  FOR UPDATE USING (true) WITH CHECK (true);
