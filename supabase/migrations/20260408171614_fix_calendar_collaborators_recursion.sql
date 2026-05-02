-- Helper: check calendar ownership without triggering RLS
CREATE OR REPLACE FUNCTION is_calendar_owner(p_calendar_id uuid, p_user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
SET row_security = off
AS $$
  SELECT EXISTS (
    SELECT 1 FROM calendars
    WHERE id = p_calendar_id AND user_id = p_user_id
  );
$$;

-- Helper: check calendar collaboration without triggering RLS
CREATE OR REPLACE FUNCTION is_calendar_collaborator(p_calendar_id uuid, p_user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
SET row_security = off
AS $$
  SELECT EXISTS (
    SELECT 1 FROM calendar_collaborators
    WHERE calendar_id = p_calendar_id AND user_id = p_user_id
  );
$$;

-- Fix collabs_calendar_owner: was querying calendars (which queries calendar_collaborators → cycle)
DROP POLICY collabs_calendar_owner ON calendar_collaborators;
CREATE POLICY collabs_calendar_owner ON calendar_collaborators
  FOR ALL
  USING (is_calendar_owner(calendar_id, auth.uid()));

-- Fix collabs_shared_calendar_read: was self-referencing calendar_collaborators
DROP POLICY collabs_shared_calendar_read ON calendar_collaborators;
CREATE POLICY collabs_shared_calendar_read ON calendar_collaborators
  FOR SELECT
  USING (is_calendar_collaborator(calendar_id, auth.uid()));
