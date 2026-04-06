-- Migration: create scheduled_posts table for daily posting reminders
-- Each row = one posting date for one client calendar for one user.
-- Safe to re-run (uses IF NOT EXISTS / DO NOTHING patterns).

CREATE TABLE IF NOT EXISTS scheduled_posts (
  id              uuid        DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id         uuid        NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  calendar_id     uuid        NOT NULL REFERENCES calendars(id) ON DELETE CASCADE,
  client_name     text        NOT NULL,
  post_date       date        NOT NULL,
  content_types   text[]      DEFAULT '{}',
  drive_links     text[]      DEFAULT '{}',
  email_sent_at   timestamptz,
  created_at      timestamptz DEFAULT now(),

  CONSTRAINT scheduled_posts_unique UNIQUE (user_id, calendar_id, post_date)
);

-- RLS: users can only see/manage their own rows
ALTER TABLE scheduled_posts ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE tablename = 'scheduled_posts' AND policyname = 'users_own_rows'
  ) THEN
    CREATE POLICY users_own_rows ON scheduled_posts
      FOR ALL
      USING      (auth.uid() = user_id)
      WITH CHECK (auth.uid() = user_id);
  END IF;
END $$;

-- Index for cron query: "all rows for today that haven't been emailed yet"
CREATE INDEX IF NOT EXISTS idx_scheduled_posts_date_unsent
  ON scheduled_posts (post_date, email_sent_at)
  WHERE email_sent_at IS NULL;
