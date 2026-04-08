-- calendar_collaborators: lets multiple users edit one calendar
CREATE TABLE calendar_collaborators (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  calendar_id  uuid NOT NULL REFERENCES calendars(id) ON DELETE CASCADE,
  user_id      uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  added_by     uuid REFERENCES auth.users(id),
  created_at   timestamptz DEFAULT now(),
  UNIQUE (calendar_id, user_id)
);

-- RLS on calendars: owner OR collaborator can read/write
ALTER TABLE calendars ENABLE ROW LEVEL SECURITY;
CREATE POLICY calendars_owner ON calendars
  FOR ALL USING (auth.uid() = user_id);
CREATE POLICY calendars_collaborator ON calendars
  FOR ALL USING (
    EXISTS (SELECT 1 FROM calendar_collaborators
            WHERE calendar_id = calendars.id AND user_id = auth.uid())
  );

-- RLS on calendar_drafts: allow if user can access the parent calendar
ALTER TABLE calendar_drafts ENABLE ROW LEVEL SECURITY;
CREATE POLICY drafts_via_calendar ON calendar_drafts
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM calendars c
      WHERE c.id = calendar_drafts.calendar_id
        AND (c.user_id = auth.uid() OR EXISTS (
          SELECT 1 FROM calendar_collaborators cc
          WHERE cc.calendar_id = c.id AND cc.user_id = auth.uid()
        ))
    )
  );

-- RLS on calendar_collaborators: owner can add/remove, collaborator can read
ALTER TABLE calendar_collaborators ENABLE ROW LEVEL SECURITY;
CREATE POLICY collabs_calendar_owner ON calendar_collaborators
  FOR ALL USING (
    EXISTS (SELECT 1 FROM calendars WHERE id = calendar_id AND user_id = auth.uid())
  );
CREATE POLICY collabs_self_read ON calendar_collaborators
  FOR SELECT USING (auth.uid() = user_id);
