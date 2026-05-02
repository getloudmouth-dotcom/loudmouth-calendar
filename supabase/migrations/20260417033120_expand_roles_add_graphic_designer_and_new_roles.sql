-- Expand profiles.role to include all current RBAC roles.
-- Backfill of remote migration 20260417033120_expand_roles_add_graphic_designer_and_new_roles.
-- (The remote migration was applied directly to prod and not committed at the time.)

-- Migrate existing designer rows to graphic_designer
UPDATE profiles SET role = 'graphic_designer' WHERE role = 'designer';

-- Replace role check constraint with expanded set
ALTER TABLE profiles DROP CONSTRAINT IF EXISTS profiles_role_check;
ALTER TABLE profiles ADD CONSTRAINT profiles_role_check
  CHECK (role = ANY (ARRAY[
    'admin', 'smm', 'graphic_designer', 'content_creator',
    'videographer', 'video_editor', 'public_relations',
    'account_manager', 'client'
  ]));
