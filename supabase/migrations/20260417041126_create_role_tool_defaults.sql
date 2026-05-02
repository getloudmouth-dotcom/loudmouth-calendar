-- Per-role tool defaults, editable by admins via AdminPortal "Role Permissions" tab.
-- Backfill of remote migration 20260417041126_create_role_tool_defaults.
-- (The remote migration was applied directly to prod and not committed at the time.)
--
-- Resolution order in App.jsx useMemo (line ~514):
--   ROLE_TOOLS[role] (constants.js)  ∪  role_tool_defaults rows (this table)
--   then per-user overrides from user_tool_access take precedence.

CREATE TABLE IF NOT EXISTS role_tool_defaults (
  role      text NOT NULL,
  tool_key  text NOT NULL,
  PRIMARY KEY (role, tool_key)
);

-- Seed with current hardcoded defaults
INSERT INTO role_tool_defaults (role, tool_key) VALUES
  ('admin',           'calendar_creator'),
  ('admin',           'content_scheduling'),
  ('admin',           'admin_portal'),
  ('admin',           'content_plan_creator'),
  ('admin',           'billing'),
  ('smm',             'calendar_creator'),
  ('smm',             'content_scheduling'),
  ('smm',             'content_plan_creator'),
  ('account_manager', 'calendar_creator'),
  ('account_manager', 'content_scheduling'),
  ('account_manager', 'content_plan_creator'),
  ('account_manager', 'billing'),
  ('content_creator', 'content_plan_creator')
ON CONFLICT DO NOTHING;

-- Allow authenticated users to read; only service role can write (writes go through API)
ALTER TABLE role_tool_defaults ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone authenticated can read role_tool_defaults"
  ON role_tool_defaults FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Admins can modify role_tool_defaults"
  ON role_tool_defaults FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
        AND profiles.role = 'admin'
        AND profiles.status = 'active'
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
        AND profiles.role = 'admin'
        AND profiles.status = 'active'
    )
  );
