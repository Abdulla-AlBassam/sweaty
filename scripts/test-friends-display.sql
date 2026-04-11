-- Test script: 8 testers favorite TLOU2, 8 testers playing Sims 3
-- Run in Supabase SQL Editor (bypasses RLS)

-- ============================================================
-- Step 1: Make abdulla follow the first 8 tester accounts
-- ============================================================
INSERT INTO follows (follower_id, following_id) VALUES
  ('9f81a30d-fa25-431a-ad97-ea457066e4be', '77e0001a-b57a-4e78-8bc6-92f981925d1b'),  -- tester_alex
  ('9f81a30d-fa25-431a-ad97-ea457066e4be', '8de62cda-7861-4160-8be3-c2650b9209a9'),  -- tester_sam
  ('9f81a30d-fa25-431a-ad97-ea457066e4be', 'e7223ae4-e606-4e8b-a204-4287f0b3d18d'),  -- tester_jordan
  ('9f81a30d-fa25-431a-ad97-ea457066e4be', 'bd245c4a-4139-4993-bab3-060b11acecc6'),  -- tester_morgan
  ('9f81a30d-fa25-431a-ad97-ea457066e4be', 'f6b43699-bb8d-4cb0-a92b-756111a42d61'),  -- tester_riley
  ('9f81a30d-fa25-431a-ad97-ea457066e4be', 'd6ac965b-8850-4e7c-9cc7-8bd04597ba3a'),  -- tester_casey
  ('9f81a30d-fa25-431a-ad97-ea457066e4be', 'f0b40274-fa35-4d03-87f0-75b4285e021e'),  -- tester_drew
  ('9f81a30d-fa25-431a-ad97-ea457066e4be', '2402cc7a-0187-4ca7-a6f2-55074ffa097e')   -- tester_taylor
ON CONFLICT DO NOTHING;

-- ============================================================
-- Step 2: 8 testers set "The Last of Us Part II" (26192) as favorite
-- ============================================================
UPDATE profiles SET favorite_games = ARRAY[26192]::bigint[]
WHERE id IN (
  '77e0001a-b57a-4e78-8bc6-92f981925d1b',  -- tester_alex
  '8de62cda-7861-4160-8be3-c2650b9209a9',  -- tester_sam
  'e7223ae4-e606-4e8b-a204-4287f0b3d18d',  -- tester_jordan
  'bd245c4a-4139-4993-bab3-060b11acecc6',  -- tester_morgan
  'f6b43699-bb8d-4cb0-a92b-756111a42d61',  -- tester_riley
  'd6ac965b-8850-4e7c-9cc7-8bd04597ba3a',  -- tester_casey
  'f0b40274-fa35-4d03-87f0-75b4285e021e',  -- tester_drew
  '2402cc7a-0187-4ca7-a6f2-55074ffa097e'   -- tester_taylor
);

-- ============================================================
-- Step 3: 8 testers log "The Sims 3" (260) as "playing"
-- ============================================================
INSERT INTO game_logs (user_id, game_id, status) VALUES
  ('77e0001a-b57a-4e78-8bc6-92f981925d1b', 260, 'playing'),  -- tester_alex
  ('8de62cda-7861-4160-8be3-c2650b9209a9', 260, 'playing'),  -- tester_sam
  ('e7223ae4-e606-4e8b-a204-4287f0b3d18d', 260, 'playing'),  -- tester_jordan
  ('bd245c4a-4139-4993-bab3-060b11acecc6', 260, 'playing'),  -- tester_morgan
  ('f6b43699-bb8d-4cb0-a92b-756111a42d61', 260, 'playing'),  -- tester_riley
  ('d6ac965b-8850-4e7c-9cc7-8bd04597ba3a', 260, 'playing'),  -- tester_casey
  ('f0b40274-fa35-4d03-87f0-75b4285e021e', 260, 'playing'),  -- tester_drew
  ('2402cc7a-0187-4ca7-a6f2-55074ffa097e', 260, 'playing')   -- tester_taylor
ON CONFLICT (user_id, game_id) DO UPDATE SET status = 'playing', updated_at = now();
