-- Add 9 New Curated Lists to Sweaty
-- Run this in Supabase SQL Editor

-- Insert new curated lists (they will start with empty game_ids)
INSERT INTO curated_lists (slug, title, description, display_order, is_active, game_ids)
VALUES
  ('xbox-exclusives', 'Xbox Exclusives', 'Microsoft''s exclusive library spanning 24 years of gaming', 11, true, ARRAY[]::BIGINT[]),
  ('nintendo-exclusives', 'Nintendo Exclusives', 'Nintendo''s 40+ years of gaming innovation', 12, true, ARRAY[]::BIGINT[]),
  ('game-pass-must-plays', 'Game Pass Must-Plays', 'Essential Xbox Game Pass titles', 13, true, ARRAY[]::BIGINT[]),
  ('ps-plus-essentials', 'PS Plus Essentials', 'PlayStation Plus Extra/Premium must-plays', 14, true, ARRAY[]::BIGINT[]),
  ('metroidvania-essentials', 'Metroidvania Essentials', 'The best interconnected 2D exploration games', 15, true, ARRAY[]::BIGINT[]),
  ('soulslike-games', 'Soulslike Games', 'FromSoftware-inspired challenging action RPGs', 16, true, ARRAY[]::BIGINT[]),
  ('racing-essentials', 'Racing Essentials', 'From simulation to arcade racing classics', 17, true, ARRAY[]::BIGINT[]),
  ('sports-essentials', 'Sports Essentials', 'The best sports games ever made', 18, true, ARRAY[]::BIGINT[]),
  ('goty-winners', 'Game of the Year Winners', 'Games that swept major GOTY awards (2000-2025)', 19, true, ARRAY[]::BIGINT[])
ON CONFLICT (slug) DO UPDATE SET
  title = EXCLUDED.title,
  description = EXCLUDED.description,
  display_order = EXCLUDED.display_order,
  is_active = EXCLUDED.is_active;
