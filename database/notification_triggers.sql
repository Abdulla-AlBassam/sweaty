-- Notification triggers
-- These use Supabase's pg_net extension to call the Vercel API when events happen.
-- Run this in Supabase SQL Editor AFTER running push_notifications.sql
--
-- IMPORTANT: Replace YOUR_SERVICE_ROLE_KEY below (3 occurrences) with your
-- actual Supabase service role key before running.

-- Enable pg_net if not already enabled
CREATE EXTENSION IF NOT EXISTS pg_net WITH SCHEMA extensions;

-- ============================================================
-- 1. NEW FOLLOWER NOTIFICATION
-- ============================================================
CREATE OR REPLACE FUNCTION notify_new_follower()
RETURNS TRIGGER AS $$
DECLARE
  follower_name text;
  follower_username text;
  api_url text := 'https://sweaty-v1.vercel.app/api/notifications/send';
  service_key text;
BEGIN
  -- Get the follower's display info
  SELECT COALESCE(display_name, username), username
    INTO follower_name, follower_username
    FROM profiles WHERE id = NEW.follower_id;

  -- Service role key (hardcoded; safe because function is SECURITY DEFINER)
  service_key := 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im9uc21sc2NxbGhwdmx0dXdlZHppIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2NTgyODA0NSwiZXhwIjoyMDgxNDA0MDQ1fQ.fKD3SOtaJEDh93e8m_fdowKPboQBa3S7phpSjfqByFw';

  IF service_key IS NULL THEN
    RETURN NEW;
  END IF;

  -- Send notification via pg_net
  PERFORM net.http_post(
    url := api_url,
    body := jsonb_build_object(
      'recipient_id', NEW.following_id,
      'type', 'new_follower',
      'title', 'New follower',
      'body', follower_name || ' started following you',
      'data', jsonb_build_object('username', follower_username)
    ),
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer ' || service_key
    )
  );

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_new_follower ON follows;
CREATE TRIGGER on_new_follower
  AFTER INSERT ON follows
  FOR EACH ROW
  EXECUTE FUNCTION notify_new_follower();


-- ============================================================
-- 2. FRIEND ACTIVITY NOTIFICATION
-- Notifies all followers when a user logs/updates a game
-- ============================================================
CREATE OR REPLACE FUNCTION notify_friend_activity()
RETURNS TRIGGER AS $$
DECLARE
  actor_name text;
  game_name text;
  game_id_str text;
  status_label text;
  follower record;
  api_url text := 'https://sweaty-v1.vercel.app/api/notifications/send';
  service_key text;
BEGIN
  -- Only notify on meaningful status changes (not want_to_play)
  IF NEW.status = 'want_to_play' THEN
    RETURN NEW;
  END IF;

  -- On UPDATE, only notify if status actually changed
  IF TG_OP = 'UPDATE' AND OLD.status = NEW.status THEN
    RETURN NEW;
  END IF;

  -- Get actor's display name
  SELECT COALESCE(display_name, username)
    INTO actor_name
    FROM profiles WHERE id = NEW.user_id;

  -- Get game name from cache
  SELECT name INTO game_name
    FROM games_cache WHERE id = NEW.game_id;

  IF game_name IS NULL THEN
    game_name := 'a game';
  END IF;

  game_id_str := NEW.game_id::text;

  -- Human-readable status
  status_label := CASE NEW.status
    WHEN 'playing' THEN 'is playing'
    WHEN 'completed' THEN 'completed'
    WHEN 'played' THEN 'played'
    WHEN 'on_hold' THEN 'put on hold'
    WHEN 'dropped' THEN 'dropped'
    ELSE 'logged'
  END;

  service_key := 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im9uc21sc2NxbGhwdmx0dXdlZHppIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2NTgyODA0NSwiZXhwIjoyMDgxNDA0MDQ1fQ.fKD3SOtaJEDh93e8m_fdowKPboQBa3S7phpSjfqByFw';

  IF service_key IS NULL THEN
    RETURN NEW;
  END IF;

  -- Notify each follower (people who follow this user)
  FOR follower IN
    SELECT follower_id FROM follows WHERE following_id = NEW.user_id
  LOOP
    PERFORM net.http_post(
      url := api_url,
      body := jsonb_build_object(
        'recipient_id', follower.follower_id,
        'type', 'friend_activity',
        'title', actor_name || ' ' || status_label || ' ' || game_name,
        'body', '',
        'data', jsonb_build_object('gameId', game_id_str)
      ),
      headers := jsonb_build_object(
        'Content-Type', 'application/json',
        'Authorization', 'Bearer ' || service_key
      )
    );
  END LOOP;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_game_log_activity ON game_logs;
CREATE TRIGGER on_game_log_activity
  AFTER INSERT OR UPDATE OF status ON game_logs
  FOR EACH ROW
  EXECUTE FUNCTION notify_friend_activity();


-- ============================================================
-- 3. STREAK REMINDER (for scheduled invocation)
-- Call from Supabase pg_cron or Vercel cron daily
-- Finds users with active streaks who haven't logged today
-- ============================================================
CREATE OR REPLACE FUNCTION send_streak_reminders()
RETURNS void AS $$
DECLARE
  user_record record;
  api_url text := 'https://sweaty-v1.vercel.app/api/notifications/send';
  service_key text;
BEGIN
  service_key := 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im9uc21sc2NxbGhwdmx0dXdlZHppIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2NTgyODA0NSwiZXhwIjoyMDgxNDA0MDQ1fQ.fKD3SOtaJEDh93e8m_fdowKPboQBa3S7phpSjfqByFw';

  IF service_key IS NULL THEN
    RETURN;
  END IF;

  -- Users with streaks >= 2 who haven't been active in 20-48 hours
  FOR user_record IN
    SELECT id, current_streak
    FROM profiles
    WHERE current_streak >= 2
      AND last_activity_at < (now() - interval '20 hours')
      AND last_activity_at > (now() - interval '48 hours')
      AND (notification_preferences->>'streak_reminders')::boolean IS NOT FALSE
  LOOP
    PERFORM net.http_post(
      url := api_url,
      body := jsonb_build_object(
        'recipient_id', user_record.id,
        'type', 'streak_reminder',
        'title', 'Don''t lose your streak!',
        'body', 'You''re on a ' || user_record.current_streak || '-day streak. Log a game to keep it going!',
        'data', '{}'::jsonb
      ),
      headers := jsonb_build_object(
        'Content-Type', 'application/json',
        'Authorization', 'Bearer ' || service_key
      )
    );
  END LOOP;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Schedule streak reminders daily at 8pm UTC (uncomment after enabling pg_cron):
-- SELECT cron.schedule('streak-reminders', '0 20 * * *', 'SELECT send_streak_reminders()');
