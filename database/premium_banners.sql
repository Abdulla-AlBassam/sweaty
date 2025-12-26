-- Premium & Banner Feature Schema
-- Run this in Supabase SQL Editor

-- Add banner and subscription columns to profiles
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS banner_url text;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS subscription_tier text DEFAULT 'free';
-- Values: 'free', 'trial', 'monthly', 'yearly', 'lifetime'
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS subscription_expires_at timestamptz;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS trial_started_at timestamptz;

-- Set abdulla as lifetime premium (the dev!)
UPDATE profiles
SET subscription_tier = 'lifetime'
WHERE username = 'abdulla';

-- Create index for faster premium lookups
CREATE INDEX IF NOT EXISTS idx_profiles_subscription_tier ON profiles(subscription_tier);

-- Optional: Create a function to check if user is premium
CREATE OR REPLACE FUNCTION is_premium(user_subscription_tier text, user_subscription_expires_at timestamptz)
RETURNS boolean AS $$
BEGIN
  -- Lifetime is always premium
  IF user_subscription_tier = 'lifetime' THEN
    RETURN true;
  END IF;

  -- Check if subscription is active (not expired)
  IF user_subscription_tier IN ('monthly', 'yearly', 'trial') THEN
    RETURN user_subscription_expires_at IS NULL OR user_subscription_expires_at > NOW();
  END IF;

  RETURN false;
END;
$$ LANGUAGE plpgsql;
