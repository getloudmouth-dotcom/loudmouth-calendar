CREATE TABLE IF NOT EXISTS user_tool_access (
  id         uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id    uuid        NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  tool_key   text        NOT NULL
             CHECK (tool_key IN ('calendar_creator', 'content_scheduling', 'admin_portal', 'content_plan', 'billing')),
  granted    boolean     NOT NULL DEFAULT true,
  granted_by uuid        REFERENCES auth.users(id),
  created_at timestamptz DEFAULT now(),
  UNIQUE (user_id, tool_key)
);

ALTER TABLE user_tool_access ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  DROP POLICY IF EXISTS tool_access_select_own ON user_tool_access;
  DROP POLICY IF EXISTS tool_access_admin_all  ON user_tool_access;
EXCEPTION WHEN OTHERS THEN NULL; END $$;

CREATE POLICY tool_access_select_own ON user_tool_access
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY tool_access_admin_all ON user_tool_access
  FOR ALL USING (is_admin());
