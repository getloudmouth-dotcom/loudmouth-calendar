-- Remove out-of-tree RLS policies applied directly via the Supabase dashboard.
-- All are redundant since calendars_authenticated / drafts_authenticated cover
-- all authenticated users. collabs_smm_read also becomes redundant once
-- calendar visibility is workspace-wide.

DROP POLICY IF EXISTS "Users see own calendars" ON calendars;
DROP POLICY IF EXISTS "calendars_smm_all" ON calendars;
DROP POLICY IF EXISTS "Users see own drafts" ON calendar_drafts;
DROP POLICY IF EXISTS "drafts_smm_all" ON calendar_drafts;
DROP POLICY IF EXISTS "collabs_smm_read" ON calendar_collaborators;

DROP FUNCTION IF EXISTS public.is_smm();
