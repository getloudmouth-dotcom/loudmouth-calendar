-- Open calendars and calendar_drafts to all authenticated users.
-- Matches the workspace-wide clients policy (20260415_billing_schema.sql)
-- and completes the client-centric architecture from 20260430.

DROP POLICY IF EXISTS calendars_owner ON calendars;
DROP POLICY IF EXISTS calendars_collaborator ON calendars;
DROP POLICY IF EXISTS drafts_via_calendar ON calendar_drafts;

CREATE POLICY calendars_authenticated ON calendars
  FOR ALL
  USING (auth.uid() IS NOT NULL)
  WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY drafts_authenticated ON calendar_drafts
  FOR ALL
  USING (auth.uid() IS NOT NULL)
  WITH CHECK (auth.uid() IS NOT NULL);
