-- Review Likes & Comments Schema
-- Run this in Supabase SQL Editor

-- ============================================
-- REVIEW LIKES TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS review_likes (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  game_log_id UUID NOT NULL REFERENCES game_logs(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

  -- One like per user per review
  UNIQUE(user_id, game_log_id)
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_review_likes_game_log_id ON review_likes(game_log_id);
CREATE INDEX IF NOT EXISTS idx_review_likes_user_id ON review_likes(user_id);

-- RLS Policies for review_likes
ALTER TABLE review_likes ENABLE ROW LEVEL SECURITY;

-- Anyone can view likes
CREATE POLICY "Anyone can view review likes"
  ON review_likes FOR SELECT
  USING (true);

-- Users can like reviews (insert their own likes)
CREATE POLICY "Users can like reviews"
  ON review_likes FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Users can unlike (delete their own likes)
CREATE POLICY "Users can unlike reviews"
  ON review_likes FOR DELETE
  USING (auth.uid() = user_id);

-- ============================================
-- REVIEW COMMENTS TABLE (with threading support)
-- ============================================
CREATE TABLE IF NOT EXISTS review_comments (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  game_log_id UUID NOT NULL REFERENCES game_logs(id) ON DELETE CASCADE,
  parent_id UUID REFERENCES review_comments(id) ON DELETE CASCADE, -- NULL for top-level, set for replies
  content TEXT NOT NULL CHECK (char_length(content) <= 500),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_review_comments_game_log_id ON review_comments(game_log_id);
CREATE INDEX IF NOT EXISTS idx_review_comments_user_id ON review_comments(user_id);
CREATE INDEX IF NOT EXISTS idx_review_comments_parent_id ON review_comments(parent_id);

-- RLS Policies for review_comments
ALTER TABLE review_comments ENABLE ROW LEVEL SECURITY;

-- Anyone can view comments
CREATE POLICY "Anyone can view review comments"
  ON review_comments FOR SELECT
  USING (true);

-- Users can add comments
CREATE POLICY "Users can add comments"
  ON review_comments FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Users can edit their own comments
CREATE POLICY "Users can edit own comments"
  ON review_comments FOR UPDATE
  USING (auth.uid() = user_id);

-- Users can delete their own comments
CREATE POLICY "Users can delete own comments"
  ON review_comments FOR DELETE
  USING (auth.uid() = user_id);

-- ============================================
-- HELPER FUNCTION: Get like count for a review
-- ============================================
CREATE OR REPLACE FUNCTION get_review_like_count(log_id UUID)
RETURNS INTEGER AS $$
  SELECT COUNT(*)::INTEGER FROM review_likes WHERE game_log_id = log_id;
$$ LANGUAGE SQL STABLE;

-- ============================================
-- HELPER FUNCTION: Check if user liked a review
-- ============================================
CREATE OR REPLACE FUNCTION has_user_liked_review(log_id UUID, uid UUID)
RETURNS BOOLEAN AS $$
  SELECT EXISTS(SELECT 1 FROM review_likes WHERE game_log_id = log_id AND user_id = uid);
$$ LANGUAGE SQL STABLE;

-- ============================================
-- HELPER FUNCTION: Get comment count for a review
-- ============================================
CREATE OR REPLACE FUNCTION get_review_comment_count(log_id UUID)
RETURNS INTEGER AS $$
  SELECT COUNT(*)::INTEGER FROM review_comments WHERE game_log_id = log_id;
$$ LANGUAGE SQL STABLE;
