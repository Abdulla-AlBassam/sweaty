-- Lock down get_service_role_key()
--
-- The function reads the live service-role key from Supabase Vault and
-- returns it as text. By default `CREATE FUNCTION` grants EXECUTE to PUBLIC,
-- which means any role with PostgREST access (including `anon` and
-- `authenticated`) could call it via:
--
--     POST /rest/v1/rpc/get_service_role_key
--
-- and receive the live service-role key — total RLS bypass for any
-- unauthenticated client with the anon key.
--
-- Revoke EXECUTE from PUBLIC and the PostgREST roles. Only `postgres` (and
-- the trigger functions, which run as `SECURITY DEFINER` and inherit
-- their owner's privileges) should be able to call it.

REVOKE EXECUTE ON FUNCTION public.get_service_role_key() FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.get_service_role_key() FROM anon;
REVOKE EXECUTE ON FUNCTION public.get_service_role_key() FROM authenticated;

-- Verify with: \df+ public.get_service_role_key
-- The "Access privileges" column should NOT include "anon" or "authenticated".
