-- HowLongToBeat cache table
-- Caches game completion times from HowLongToBeat (30-day TTL recommended)

CREATE TABLE IF NOT EXISTS hltb_cache (
  igdb_game_id BIGINT PRIMARY KEY,
  hltb_id INTEGER,
  main_story DECIMAL(5,1),        -- hours for main story
  main_plus_extras DECIMAL(5,1),  -- hours for main + extras
  completionist DECIMAL(5,1),     -- hours for 100% completion
  cached_at TIMESTAMPTZ DEFAULT NOW()
);

-- Index for cache expiry queries
CREATE INDEX IF NOT EXISTS idx_hltb_cache_cached_at ON hltb_cache(cached_at);

-- Allow public read access (no auth required to view game times)
ALTER TABLE hltb_cache ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow public read access" ON hltb_cache
  FOR SELECT USING (true);

CREATE POLICY "Allow service role insert/update" ON hltb_cache
  FOR ALL USING (true);
