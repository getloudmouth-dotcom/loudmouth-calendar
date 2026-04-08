-- Migration: RBAC — profiles, user_tool_access, auto-create trigger, RLS
-- Safe to re-run (uses IF NOT EXISTS / ON CONFLICT DO NOTHING / OR REPLACE patterns).
--
-- After running this migration, make yourself admin by running:
--   UPDATE profiles SET role = 'admin' WHERE email = 'your@email.com';

-- ── profiles ─────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS profiles (
  id         uuid        PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email      text        NOT NULL DEFAULT '',
  name       text        NOT NULL DEFAULT '',
  job_title  text        NOT NULL DEFAULT '',
  role       text        NOT NULL DEFAULT 'smm'
             CHECK (role IN ('admin', 'smm', 'designer', 'client')),
  status     text        NOT NULL DEFAULT 'active'
             CHECK (status IN ('active', 'inactive')),
  invited_by uuid        REFERENCES auth.users(id),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Back-fill existing auth users into profiles (role = 'smm' by default).
-- After running, manually set your own role to 'admin'.
INSERT INTO profiles (id, email, name, role)
SELECT
  id,
  COALESCE(email, ''),
  COALESCE(raw_user_meta_data->>'display_name', raw_user_meta_data->>'name', ''),
  'smm'
FROM auth.users
ON CONFLICT (id) DO NOTHING;

-- ── user_tool_access ──────────────────────────────────────────────────────────
-- Per-user overrides on top of role defaults.
-- A row with granted=true grants a tool the role doesn't have.
-- A row with granted=false revokes a tool the role does have.
CREATE TABLE IF NOT EXISTS user_tool_access (
  id         uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id    uuid        NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  tool_key   text        NOT NULL
             CHECK (tool_key IN ('calendar_creator', 'content_scheduling', 'admin_portal')),
  granted    boolean     NOT NULL DEFAULT true,
  granted_by uuid        REFERENCES auth.users(id),
  created_at timestamptz DEFAULT now(),
  UNIQUE (user_id, tool_key)
);

-- ── Auto-create profile on new user ──────────────────────────────────────────
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO profiles (id, email, name, job_title, role, invited_by)
  VALUES (
    NEW.id,
    COALESCE(NEW.email, ''),
    COALESCE(NEW.raw_user_meta_data->>'display_name', NEW.raw_user_meta_data->>'name', ''),
    COALESCE(NEW.raw_user_meta_data->>'job_title', ''),
    COALESCE(NEW.raw_user_meta_data->>'role', 'smm'),
    CASE
      WHEN NEW.raw_user_meta_data->>'invited_by' IS NOT NULL
      THEN (NEW.raw_user_meta_data->>'invited_by')::uuid
      ELSE NULL
    END
  )
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION handle_new_user();

-- ── is_admin() helper (used in RLS policies) ──────────────────────────────────
CREATE OR REPLACE FUNCTION is_admin()
RETURNS boolean AS $$
  SELECT EXISTS (
    SELECT 1 FROM profiles
    WHERE id = auth.uid() AND role = 'admin' AND status = 'active'
  );
$$ LANGUAGE sql SECURITY DEFINER STABLE;

-- ── RLS on profiles ───────────────────────────────────────────────────────────
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  DROP POLICY IF EXISTS profiles_select_own   ON profiles;
  DROP POLICY IF EXISTS profiles_select_admin ON profiles;
  DROP POLICY IF EXISTS profiles_update_own   ON profiles;
  DROP POLICY IF EXISTS profiles_admin_all    ON profiles;
EXCEPTION WHEN OTHERS THEN NULL; END $$;

-- Any user can read their own profile
CREATE POLICY profiles_select_own ON profiles
  FOR SELECT USING (auth.uid() = id);

-- Admins can read all profiles
CREATE POLICY profiles_select_admin ON profiles
  FOR SELECT USING (is_admin());

-- Any user can update their own profile (name, job_title)
CREATE POLICY profiles_update_own ON profiles
  FOR UPDATE USING (auth.uid() = id);

-- Admins can do anything (insert/update/delete) to any profile
CREATE POLICY profiles_admin_all ON profiles
  FOR ALL USING (is_admin());

-- ── RLS on user_tool_access ───────────────────────────────────────────────────
ALTER TABLE user_tool_access ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  DROP POLICY IF EXISTS tool_access_select_own ON user_tool_access;
  DROP POLICY IF EXISTS tool_access_admin_all  ON user_tool_access;
EXCEPTION WHEN OTHERS THEN NULL; END $$;

-- Users can read their own tool overrides (needed to compute permissions on login)
CREATE POLICY tool_access_select_own ON user_tool_access
  FOR SELECT USING (auth.uid() = user_id);

-- Admins can do anything to any row
CREATE POLICY tool_access_admin_all ON user_tool_access
  FOR ALL USING (is_admin());
