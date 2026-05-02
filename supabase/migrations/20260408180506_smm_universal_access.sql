-- ── is_smm() helper ───────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION is_smm()
RETURNS boolean AS $$
  SELECT EXISTS (
    SELECT 1 FROM profiles
    WHERE id = auth.uid() AND role = 'smm' AND status = 'active'
  );
$$ LANGUAGE sql SECURITY DEFINER STABLE;

-- ── Calendars: SMMs can access all rows ──────────────────────────────────────
DROP POLICY IF EXISTS calendars_smm_all ON calendars;
CREATE POLICY calendars_smm_all ON calendars
  FOR ALL USING (is_smm());

-- ── Calendar drafts: SMMs can access all rows ────────────────────────────────
DROP POLICY IF EXISTS drafts_smm_all ON calendar_drafts;
CREATE POLICY drafts_smm_all ON calendar_drafts
  FOR ALL USING (is_smm());

-- ── Calendar collaborators: SMMs can read all rows ───────────────────────────
DROP POLICY IF EXISTS collabs_smm_read ON calendar_collaborators;
CREATE POLICY collabs_smm_read ON calendar_collaborators
  FOR SELECT USING (is_smm());
