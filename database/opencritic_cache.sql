-- OpenCritic cache table
-- Caches OpenCritic scores to reduce API calls (7-day cache)

CREATE TABLE IF NOT EXISTS opencritic_cache (
  igdb_game_id BIGINT PRIMARY KEY,
  opencritic_id INTEGER,
  score INTEGER,
  tier TEXT,
  num_reviews INTEGER,
  cached_at TIMESTAMPTZ DEFAULT NOW()
);

-- Index for faster lookups
CREATE INDEX IF NOT EXISTS idx_opencritic_cache_cached_at ON opencritic_cache(cached_at);

-- Allow public read access (scores are public data)
ALTER TABLE opencritic_cache ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can read opencritic cache"
  ON opencritic_cache FOR SELECT
  USING (true);

-- Only service role can insert/update (via API)
CREATE POLICY "Service role can manage opencritic cache"
  ON opencritic_cache FOR ALL
  USING (auth.role() = 'service_role');
