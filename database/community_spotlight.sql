-- =============================================================================
-- Community Spotlight
-- =============================================================================
-- Adds persisted total_xp + level columns on profiles so the Community
-- Spotlight "Rank" tab can order users by XP without re-aggregating game_logs
-- on every read.
--
-- Triggers keep the values in sync after any change to game_logs or follows,
-- and match the XP formula used on the client in mobile/src/lib/xp.ts.
--
-- Safe to re-run. Uses IF NOT EXISTS and CREATE OR REPLACE throughout.
-- =============================================================================

-- 1. Columns -----------------------------------------------------------------
ALTER TABLE profiles
  ADD COLUMN IF NOT EXISTS total_xp integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS level integer NOT NULL DEFAULT 0;

CREATE INDEX IF NOT EXISTS profiles_total_xp_idx
  ON profiles (total_xp DESC)
  WHERE total_xp > 0;

CREATE INDEX IF NOT EXISTS profiles_longest_streak_idx
  ON profiles (longest_streak DESC)
  WHERE longest_streak > 0;

-- 2. XP -> level helper (mirrors getLevel() in mobile/src/lib/xp.ts) --------
CREATE OR REPLACE FUNCTION xp_to_level(xp integer)
RETURNS integer
LANGUAGE plpgsql
IMMUTABLE
AS $$
DECLARE
  thresholds integer[] := ARRAY[
    0, 50, 150, 400, 800, 1500, 2500, 4000, 6000,
    9000, 13000, 18000, 25000, 35000, 50000, 60000
  ];
  i integer;
BEGIN
  FOR i IN REVERSE array_length(thresholds, 1) .. 1 LOOP
    IF xp >= thresholds[i] THEN
      RETURN i - 1;  -- array is 1-indexed, levels are 0-indexed
    END IF;
  END LOOP;
  RETURN 0;
END;
$$;

-- 3. Recompute a single user's XP and level ---------------------------------
-- XP values (must match mobile/src/lib/xp.ts XP_VALUES):
--   completed = 100, played = 50, playing = 25, on_hold = 25, dropped = 10,
--   want_to_play = 0, review = 30, rating = 5, follower = 10
-- Review takes priority over rating.
CREATE OR REPLACE FUNCTION recompute_user_xp(target_user_id uuid)
RETURNS void
LANGUAGE plpgsql
AS $$
DECLARE
  log_xp integer := 0;
  follower_xp integer := 0;
  new_total integer := 0;
  new_level integer := 0;
BEGIN
  SELECT COALESCE(SUM(
    CASE status
      WHEN 'completed'    THEN 100
      WHEN 'played'       THEN 50
      WHEN 'playing'      THEN 25
      WHEN 'on_hold'      THEN 25
      WHEN 'dropped'      THEN 10
      ELSE 0
    END
    +
    CASE
      WHEN review IS NOT NULL AND length(btrim(review)) > 0 THEN 30
      WHEN rating IS NOT NULL THEN 5
      ELSE 0
    END
  ), 0)
  INTO log_xp
  FROM game_logs
  WHERE user_id = target_user_id;

  SELECT COALESCE(COUNT(*), 0) * 10
  INTO follower_xp
  FROM follows
  WHERE following_id = target_user_id;

  new_total := log_xp + follower_xp;
  new_level := xp_to_level(new_total);

  UPDATE profiles
  SET total_xp = new_total,
      level = new_level
  WHERE id = target_user_id;
END;
$$;

-- 4. Trigger wrappers --------------------------------------------------------
CREATE OR REPLACE FUNCTION trg_recompute_xp_from_game_logs()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  IF TG_OP = 'DELETE' THEN
    PERFORM recompute_user_xp(OLD.user_id);
    RETURN OLD;
  ELSE
    PERFORM recompute_user_xp(NEW.user_id);
    IF TG_OP = 'UPDATE' AND OLD.user_id IS DISTINCT FROM NEW.user_id THEN
      PERFORM recompute_user_xp(OLD.user_id);
    END IF;
    RETURN NEW;
  END IF;
END;
$$;

CREATE OR REPLACE FUNCTION trg_recompute_xp_from_follows()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  IF TG_OP = 'DELETE' THEN
    PERFORM recompute_user_xp(OLD.following_id);
    RETURN OLD;
  ELSE
    PERFORM recompute_user_xp(NEW.following_id);
    RETURN NEW;
  END IF;
END;
$$;

DROP TRIGGER IF EXISTS game_logs_xp_recompute ON game_logs;
CREATE TRIGGER game_logs_xp_recompute
  AFTER INSERT OR UPDATE OR DELETE ON game_logs
  FOR EACH ROW
  EXECUTE FUNCTION trg_recompute_xp_from_game_logs();

DROP TRIGGER IF EXISTS follows_xp_recompute ON follows;
CREATE TRIGGER follows_xp_recompute
  AFTER INSERT OR DELETE ON follows
  FOR EACH ROW
  EXECUTE FUNCTION trg_recompute_xp_from_follows();

-- 5. One-time backfill -------------------------------------------------------
-- Recomputes every profile so existing rows get correct total_xp + level.
DO $$
DECLARE
  profile_row record;
BEGIN
  FOR profile_row IN SELECT id FROM profiles LOOP
    PERFORM recompute_user_xp(profile_row.id);
  END LOOP;
END;
$$;
