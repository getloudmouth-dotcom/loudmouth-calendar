-- Opt-in notifications: per-row notify flag + read access for "who's opted in" view

-- 1. Add notify flag (default true; existing rows keep reminders)
ALTER TABLE scheduled_posts ADD COLUMN IF NOT EXISTS notify boolean NOT NULL DEFAULT true;

-- 2. Calendar owners can read all scheduled_posts for their calendars
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE tablename = 'scheduled_posts' AND policyname = 'scheduled_posts_calendar_owner_read'
  ) THEN
    CREATE POLICY scheduled_posts_calendar_owner_read ON scheduled_posts
      FOR SELECT USING (
        EXISTS (SELECT 1 FROM calendars WHERE id = calendar_id AND user_id = auth.uid())
      );
  END IF;
END $$;

-- 3. Collaborators can read scheduled_posts for calendars they share
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE tablename = 'scheduled_posts' AND policyname = 'scheduled_posts_collab_read'
  ) THEN
    CREATE POLICY scheduled_posts_collab_read ON scheduled_posts
      FOR SELECT USING (
        EXISTS (
          SELECT 1 FROM calendar_collaborators
          WHERE calendar_id = scheduled_posts.calendar_id AND user_id = auth.uid()
        )
      );
  END IF;
END $$;

-- 4. Any authenticated user can read basic profile info (name/email) for collaboration UI
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE tablename = 'profiles' AND policyname = 'profiles_select_authenticated'
  ) THEN
    CREATE POLICY profiles_select_authenticated ON profiles
      FOR SELECT USING (auth.uid() IS NOT NULL);
  END IF;
END $$;
