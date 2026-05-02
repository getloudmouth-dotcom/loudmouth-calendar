-- 1. Add user_id to calendar_drafts (nullable, for realtime attribution)
ALTER TABLE calendar_drafts
  ADD COLUMN IF NOT EXISTS user_id uuid REFERENCES auth.users(id);

-- 2. Add permission to calendar_collaborators
ALTER TABLE calendar_collaborators
  ADD COLUMN IF NOT EXISTS permission text NOT NULL DEFAULT 'editor'
  CHECK (permission IN ('viewer', 'editor'));

-- 3. RLS: allow collaborators to see the full collaborator list for calendars they're on
CREATE POLICY "collabs_shared_calendar_read"
  ON calendar_collaborators
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM calendar_collaborators cc2
      WHERE cc2.calendar_id = calendar_collaborators.calendar_id
        AND cc2.user_id = auth.uid()
    )
  );

-- 4. RLS: allow any authenticated user to read profiles of people they share a calendar with
CREATE POLICY "profiles_collaborator_read"
  ON profiles
  FOR SELECT
  USING (
    id IN (
      SELECT cc.user_id FROM calendar_collaborators cc
      WHERE cc.calendar_id IN (
        SELECT cc2.calendar_id FROM calendar_collaborators cc2
        WHERE cc2.user_id = auth.uid()
        UNION
        SELECT c.id FROM calendars c WHERE c.user_id = auth.uid()
      )
    )
  );
