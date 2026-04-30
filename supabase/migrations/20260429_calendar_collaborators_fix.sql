-- Add missing permission column
ALTER TABLE calendar_collaborators
  ADD COLUMN IF NOT EXISTS permission text NOT NULL DEFAULT 'editor'
    CHECK (permission IN ('editor', 'viewer'));

-- Add FK to public.profiles so PostgREST can join them
-- (user_id already references auth.users, but PostgREST can't traverse that join)
ALTER TABLE calendar_collaborators
  ADD CONSTRAINT calendar_collaborators_user_id_profiles_fkey
  FOREIGN KEY (user_id) REFERENCES profiles(id) ON DELETE CASCADE;
