-- Custom Lists Feature
-- Run this in Supabase SQL Editor

-- =====================================================
-- TABLE: lists
-- =====================================================
CREATE TABLE IF NOT EXISTS lists (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  title text NOT NULL,
  description text,
  is_public boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Index for fetching user's lists
CREATE INDEX IF NOT EXISTS idx_lists_user_id ON lists(user_id);

-- Index for fetching public lists
CREATE INDEX IF NOT EXISTS idx_lists_public ON lists(is_public) WHERE is_public = true;

-- Auto-update updated_at timestamp
CREATE OR REPLACE FUNCTION update_lists_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_lists_updated_at ON lists;
CREATE TRIGGER trigger_lists_updated_at
  BEFORE UPDATE ON lists
  FOR EACH ROW
  EXECUTE FUNCTION update_lists_updated_at();

-- =====================================================
-- TABLE: list_items
-- =====================================================
CREATE TABLE IF NOT EXISTS list_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  list_id uuid NOT NULL REFERENCES lists(id) ON DELETE CASCADE,
  game_id bigint NOT NULL REFERENCES games_cache(id) ON DELETE CASCADE,
  position int NOT NULL DEFAULT 0,
  added_at timestamptz NOT NULL DEFAULT now(),

  -- Prevent duplicate games in the same list
  UNIQUE(list_id, game_id)
);

-- Index for fetching items in a list (ordered by position)
CREATE INDEX IF NOT EXISTS idx_list_items_list_id ON list_items(list_id, position);

-- Index for finding which lists contain a specific game
CREATE INDEX IF NOT EXISTS idx_list_items_game_id ON list_items(game_id);

-- =====================================================
-- RLS POLICIES: lists
-- =====================================================
ALTER TABLE lists ENABLE ROW LEVEL SECURITY;

-- Anyone can view public lists
CREATE POLICY "Public lists are viewable by everyone"
  ON lists FOR SELECT
  USING (is_public = true);

-- Users can view their own private lists
CREATE POLICY "Users can view own lists"
  ON lists FOR SELECT
  USING (auth.uid() = user_id);

-- Users can create their own lists
CREATE POLICY "Users can create own lists"
  ON lists FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Users can update their own lists
CREATE POLICY "Users can update own lists"
  ON lists FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Users can delete their own lists
CREATE POLICY "Users can delete own lists"
  ON lists FOR DELETE
  USING (auth.uid() = user_id);

-- =====================================================
-- RLS POLICIES: list_items
-- =====================================================
ALTER TABLE list_items ENABLE ROW LEVEL SECURITY;

-- Anyone can view items in public lists
CREATE POLICY "Public list items are viewable by everyone"
  ON list_items FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM lists
      WHERE lists.id = list_items.list_id
      AND lists.is_public = true
    )
  );

-- Users can view items in their own private lists
CREATE POLICY "Users can view own list items"
  ON list_items FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM lists
      WHERE lists.id = list_items.list_id
      AND lists.user_id = auth.uid()
    )
  );

-- Users can add items to their own lists
CREATE POLICY "Users can add items to own lists"
  ON list_items FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM lists
      WHERE lists.id = list_items.list_id
      AND lists.user_id = auth.uid()
    )
  );

-- Users can update items in their own lists (for reordering)
CREATE POLICY "Users can update items in own lists"
  ON list_items FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM lists
      WHERE lists.id = list_items.list_id
      AND lists.user_id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM lists
      WHERE lists.id = list_items.list_id
      AND lists.user_id = auth.uid()
    )
  );

-- Users can remove items from their own lists
CREATE POLICY "Users can delete items from own lists"
  ON list_items FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM lists
      WHERE lists.id = list_items.list_id
      AND lists.user_id = auth.uid()
    )
  );
