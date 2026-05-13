-- AI Recommendations Cache Table
-- Stores AI-generated personalized recommendations for users
-- Cache TTL: 24 hours

CREATE TABLE IF NOT EXISTS ai_recommendations_cache (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  list_type TEXT NOT NULL, -- 'because_you_loved', 'from_backlog', 'hidden_gems', etc.
  seed_game_id BIGINT, -- The game the recommendation is based on (if applicable)
  seed_game_name TEXT, -- Cached name for display
  games JSONB NOT NULL, -- Array of {id, name, coverUrl, reason}
  ai_explanation TEXT, -- AI's explanation for why these were chosen
  generated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  -- Unique constraint: one cache entry per user per list type
  UNIQUE(user_id, list_type)
);

-- Index for fast lookups
CREATE INDEX IF NOT EXISTS idx_ai_recommendations_user_id ON ai_recommendations_cache(user_id);
CREATE INDEX IF NOT EXISTS idx_ai_recommendations_generated_at ON ai_recommendations_cache(generated_at);

-- Enable RLS
ALTER TABLE ai_recommendations_cache ENABLE ROW LEVEL SECURITY;

-- RLS Policies
-- Users can read their own cached recommendations
CREATE POLICY "Users can read own recommendations" ON ai_recommendations_cache
  FOR SELECT USING (auth.uid() = user_id);

-- Service role can insert/update (API uses service role).
-- Scoped to the service_role grantee so authenticated users CANNOT match this
-- policy and trash other users' rows. Without `TO service_role`, the
-- permissive `USING (true)` would apply to every role including
-- `authenticated`, allowing any logged-in user to DELETE or INSERT arbitrary
-- rows for any user_id via the anon key.
CREATE POLICY "Service role can manage recommendations" ON ai_recommendations_cache
  FOR ALL TO service_role USING (true) WITH CHECK (true);

-- ================================================
-- Rate Limiting: Add columns to profiles table
-- ================================================

-- Add rate limiting columns to profiles (run separately if profiles already exists)
ALTER TABLE profiles
  ADD COLUMN IF NOT EXISTS ai_requests_today INTEGER DEFAULT 0,
  ADD COLUMN IF NOT EXISTS ai_requests_reset_at TIMESTAMPTZ DEFAULT NOW();

-- Comment explaining the columns
COMMENT ON COLUMN profiles.ai_requests_today IS 'Number of AI requests made today';
COMMENT ON COLUMN profiles.ai_requests_reset_at IS 'Timestamp when ai_requests_today should reset';
