-- Curated Lists Table
-- Stores game lists for the search/discover screen
-- Each list contains an ordered array of IGDB game IDs

CREATE TABLE IF NOT EXISTS curated_lists (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  slug TEXT UNIQUE NOT NULL,
  title TEXT NOT NULL,
  description TEXT,
  game_ids BIGINT[] NOT NULL DEFAULT '{}',
  display_order INT NOT NULL DEFAULT 0,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Index for ordering and active filter
CREATE INDEX idx_curated_lists_display_order ON curated_lists(display_order) WHERE is_active = true;

-- Enable Row Level Security
ALTER TABLE curated_lists ENABLE ROW LEVEL SECURITY;

-- Anyone can read curated lists
CREATE POLICY "Anyone can read curated lists"
  ON curated_lists FOR SELECT
  USING (true);

-- Only admins can modify (for now, we'll manage via Supabase dashboard)
-- In the future, add admin roles table and proper admin policies

-- Insert the 10 curated lists
INSERT INTO curated_lists (slug, title, description, game_ids, display_order) VALUES
  ('2025-essentials', '2025 Essentials', 'The must-play games of 2025', '{}', 1),
  ('playstation-exclusives', 'PlayStation Exclusives', 'Best games only on PlayStation', '{}', 2),
  ('pc-exclusive', 'PC Exclusive', 'Experiences you can only get on PC', '{}', 3),
  ('goated-remakes', 'GOATed Remakes', 'Classic games remade to perfection', '{}', 4),
  ('co-op-must-haves', 'Co-Op Must-Haves', 'Best games to play with friends', '{}', 5),
  ('short-and-sweet', 'Short & Sweet', 'Amazing games under 10 hours', '{}', 6),
  ('new-releases', 'New Releases', 'Just dropped - fresh games to check out', '{}', 7),
  ('coming-soon', 'Coming Soon', 'Upcoming games to keep on your radar', '{}', 8),
  ('timeless-classics', 'Timeless Classics', 'Games that defined generations', '{}', 9),
  ('story-driven', 'Story-Driven', 'Unforgettable narrative experiences', '{}', 10);

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_curated_lists_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to auto-update updated_at
CREATE TRIGGER curated_lists_updated_at
  BEFORE UPDATE ON curated_lists
  FOR EACH ROW
  EXECUTE FUNCTION update_curated_lists_updated_at();
