-- Platform Connections & Platform Games Tables
-- For importing game libraries from Steam, Xbox, and PlayStation

-- ============================================
-- PLATFORM_CONNECTIONS TABLE
-- Stores user's linked platform accounts
-- ============================================

CREATE TABLE IF NOT EXISTS platform_connections (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    platform text NOT NULL CHECK (platform IN ('steam', 'xbox', 'playstation')),
    platform_user_id text NOT NULL,
    platform_username text,
    access_token text,
    refresh_token text,
    token_expires_at timestamptz,
    last_synced_at timestamptz,
    created_at timestamptz DEFAULT now(),
    updated_at timestamptz DEFAULT now(),

    -- Each user can only link one account per platform
    UNIQUE (user_id, platform)
);

-- Index for quick lookups by user
CREATE INDEX IF NOT EXISTS idx_platform_connections_user_id ON platform_connections(user_id);

-- Index for finding connections by platform
CREATE INDEX IF NOT EXISTS idx_platform_connections_platform ON platform_connections(platform);

-- ============================================
-- PLATFORM_GAMES TABLE
-- Tracks imported games and their platform-specific data
-- ============================================

CREATE TABLE IF NOT EXISTS platform_games (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    platform text NOT NULL CHECK (platform IN ('steam', 'xbox', 'playstation')),
    platform_game_id text NOT NULL,
    igdb_game_id bigint REFERENCES games_cache(id) ON DELETE SET NULL,
    game_name text NOT NULL,
    playtime_minutes integer,
    last_played_at timestamptz,
    achievements_earned integer,
    achievements_total integer,
    imported_at timestamptz DEFAULT now(),

    -- Each game can only be imported once per user per platform
    UNIQUE (user_id, platform, platform_game_id)
);

-- Index for quick lookups by user
CREATE INDEX IF NOT EXISTS idx_platform_games_user_id ON platform_games(user_id);

-- Index for finding games by platform
CREATE INDEX IF NOT EXISTS idx_platform_games_platform ON platform_games(platform);

-- Index for finding games by IGDB ID (for matching)
CREATE INDEX IF NOT EXISTS idx_platform_games_igdb_game_id ON platform_games(igdb_game_id);

-- Composite index for user + platform queries
CREATE INDEX IF NOT EXISTS idx_platform_games_user_platform ON platform_games(user_id, platform);

-- ============================================
-- UPDATED_AT TRIGGER
-- Auto-update the updated_at column
-- ============================================

-- Trigger function (if not already exists)
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Apply trigger to platform_connections
DROP TRIGGER IF EXISTS update_platform_connections_updated_at ON platform_connections;
CREATE TRIGGER update_platform_connections_updated_at
    BEFORE UPDATE ON platform_connections
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- ============================================
-- ROW LEVEL SECURITY (RLS)
-- ============================================

-- Enable RLS on both tables
ALTER TABLE platform_connections ENABLE ROW LEVEL SECURITY;
ALTER TABLE platform_games ENABLE ROW LEVEL SECURITY;

-- PLATFORM_CONNECTIONS POLICIES

-- Users can view their own connections (but not access_token/refresh_token via API)
CREATE POLICY "Users can view own platform connections"
    ON platform_connections
    FOR SELECT
    USING (auth.uid() = user_id);

-- Users can insert their own connections
CREATE POLICY "Users can insert own platform connections"
    ON platform_connections
    FOR INSERT
    WITH CHECK (auth.uid() = user_id);

-- Users can update their own connections
CREATE POLICY "Users can update own platform connections"
    ON platform_connections
    FOR UPDATE
    USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);

-- Users can delete their own connections
CREATE POLICY "Users can delete own platform connections"
    ON platform_connections
    FOR DELETE
    USING (auth.uid() = user_id);

-- PLATFORM_GAMES POLICIES

-- Users can view their own imported games
CREATE POLICY "Users can view own platform games"
    ON platform_games
    FOR SELECT
    USING (auth.uid() = user_id);

-- Users can insert their own imported games
CREATE POLICY "Users can insert own platform games"
    ON platform_games
    FOR INSERT
    WITH CHECK (auth.uid() = user_id);

-- Users can update their own imported games
CREATE POLICY "Users can update own platform games"
    ON platform_games
    FOR UPDATE
    USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);

-- Users can delete their own imported games
CREATE POLICY "Users can delete own platform games"
    ON platform_games
    FOR DELETE
    USING (auth.uid() = user_id);

-- ============================================
-- SECURITY NOTE
-- ============================================
-- The access_token and refresh_token columns contain sensitive data.
-- While RLS prevents users from seeing other users' tokens, the tokens
-- ARE readable by the user who owns them via the Supabase client.
--
-- For additional security, consider:
-- 1. Using a separate "secrets" table with stricter access
-- 2. Encrypting tokens at rest using pgcrypto
-- 3. Only storing tokens server-side and never exposing via API
--
-- For now, we rely on RLS to ensure users only see their own data.
