-- Waitlist email signups for pre-launch landing page
CREATE TABLE IF NOT EXISTS waitlist_emails (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  email text NOT NULL UNIQUE,
  created_at timestamptz DEFAULT now() NOT NULL
);

-- RLS: anyone can insert, only service role can read
ALTER TABLE waitlist_emails ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can sign up for the waitlist"
  ON waitlist_emails
  FOR INSERT
  TO anon, authenticated
  WITH CHECK (true);
