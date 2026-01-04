-- Hero Banners table for homepage featured screenshots
-- These are managed by the developer and shown to all users

CREATE TABLE hero_banners (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  game_id bigint NOT NULL,
  game_name text NOT NULL,
  screenshot_url text NOT NULL,
  display_order int DEFAULT 0,
  is_active boolean DEFAULT true,
  created_at timestamptz DEFAULT now()
);

-- Index for fetching active banners in order
CREATE INDEX idx_hero_banners_active ON hero_banners(is_active, display_order);

-- RLS policies
ALTER TABLE hero_banners ENABLE ROW LEVEL SECURITY;

-- Anyone can read active banners
CREATE POLICY "Anyone can view active hero banners"
  ON hero_banners FOR SELECT
  USING (is_active = true);

-- Only service role can insert/update/delete (admin API)
-- For now, we'll use service role key for admin operations
