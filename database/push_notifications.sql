-- Push notification infrastructure
-- Run this in Supabase SQL Editor

-- 1. Push tokens table - stores device push tokens
CREATE TABLE IF NOT EXISTS push_tokens (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  token text NOT NULL,
  platform text NOT NULL CHECK (platform IN ('ios', 'android')),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE(user_id, token)
);

-- Index for looking up tokens by user
CREATE INDEX IF NOT EXISTS idx_push_tokens_user_id ON push_tokens(user_id);

-- RLS policies
ALTER TABLE push_tokens ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage their own push tokens"
  ON push_tokens FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Service role can read all tokens (for sending notifications)
CREATE POLICY "Service role can read all push tokens"
  ON push_tokens FOR SELECT
  USING (auth.role() = 'service_role');

-- 2. Add notification preferences to profiles
ALTER TABLE profiles
  ADD COLUMN IF NOT EXISTS notification_preferences jsonb DEFAULT '{
    "new_followers": true,
    "friend_activity": true,
    "streak_reminders": true
  }'::jsonb;
