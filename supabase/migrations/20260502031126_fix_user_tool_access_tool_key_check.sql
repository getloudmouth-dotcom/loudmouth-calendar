-- Realign user_tool_access.tool_key CHECK with constants.js ALL_TOOLS.
-- Previous CHECK (from create_user_tool_access, 20260422032202) used 'content_plan'
-- and was missing 'grid_creator', so per-user grants of those tools would fail.
-- user_tool_access has 0 rows in prod at the time of this migration — no data backfill needed.

ALTER TABLE user_tool_access DROP CONSTRAINT IF EXISTS user_tool_access_tool_key_check;
ALTER TABLE user_tool_access ADD CONSTRAINT user_tool_access_tool_key_check
  CHECK (tool_key IN (
    'calendar_creator',
    'content_scheduling',
    'admin_portal',
    'content_plan_creator',
    'billing',
    'grid_creator'
  ));

-- Backfill missing role_tool_defaults seed rows for grid_creator.
-- The original seed in 20260417_create_role_tool_defaults predates grid_creator.
INSERT INTO role_tool_defaults (role, tool_key) VALUES
  ('admin',            'grid_creator'),
  ('smm',              'grid_creator'),
  ('graphic_designer', 'grid_creator')
ON CONFLICT DO NOTHING;
