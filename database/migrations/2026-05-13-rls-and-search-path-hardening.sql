-- 2026-05-13: RLS WITH CHECK additions + SECURITY DEFINER search_path pinning
--
-- 1. Three UPDATE policies were missing WITH CHECK clauses, allowing a user to
--    flip the owner column on their own row (impersonation).
-- 2. Five SECURITY DEFINER functions were missing SET search_path, which
--    Supabase's linter flags ("Function Search Path Mutable").
-- 3. Three redundant SELECT-everyone policies on profiles collapsed into one.

-- ---- 1. WITH CHECK on UPDATE policies ----

DROP POLICY IF EXISTS "Users can update their own game logs" ON game_logs;
CREATE POLICY "Users can update their own game logs" ON game_logs
  FOR UPDATE USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update their own profile" ON profiles;
DROP POLICY IF EXISTS "Users can update own profile" ON profiles;
CREATE POLICY "Users can update own profile" ON profiles
  FOR UPDATE USING (auth.uid() = id) WITH CHECK (auth.uid() = id);

DROP POLICY IF EXISTS "Users can edit own comments" ON review_comments;
CREATE POLICY "Users can edit own comments" ON review_comments
  FOR UPDATE USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- ---- 2. SECURITY DEFINER search_path ----

ALTER FUNCTION public.get_service_role_key() SET search_path = pg_catalog, public;
ALTER FUNCTION public.handle_new_user() SET search_path = pg_catalog, public;
ALTER FUNCTION public.notify_new_follower() SET search_path = pg_catalog, public, extensions;
ALTER FUNCTION public.notify_friend_activity() SET search_path = pg_catalog, public, extensions;
ALTER FUNCTION public.send_streak_reminders() SET search_path = pg_catalog, public, extensions;

-- ---- 3. Collapse redundant SELECT-all profiles policies ----

DROP POLICY IF EXISTS "Profiles are viewable by everyone" ON profiles;
DROP POLICY IF EXISTS "Anyone can view profiles" ON profiles;
DROP POLICY IF EXISTS "Users can view all profiles" ON profiles;
CREATE POLICY "Profiles are viewable by everyone" ON profiles
  FOR SELECT USING (true);
