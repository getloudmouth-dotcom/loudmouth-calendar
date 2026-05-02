-- Function: delete oldest drafts beyond 25 per calendar after each insert
CREATE OR REPLACE FUNCTION public.enforce_calendar_draft_retention()
RETURNS TRIGGER AS $$
BEGIN
  DELETE FROM public.calendar_drafts
  WHERE id IN (
    SELECT id FROM public.calendar_drafts
    WHERE calendar_id = NEW.calendar_id
    ORDER BY saved_at DESC
    OFFSET 25
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger: fire after each insert on calendar_drafts
DROP TRIGGER IF EXISTS trg_calendar_draft_retention ON public.calendar_drafts;
CREATE TRIGGER trg_calendar_draft_retention
  AFTER INSERT ON public.calendar_drafts
  FOR EACH ROW EXECUTE FUNCTION public.enforce_calendar_draft_retention();

-- Clean up existing rows beyond 25 per calendar right now
DELETE FROM public.calendar_drafts
WHERE id IN (
  SELECT id FROM (
    SELECT id, ROW_NUMBER() OVER (PARTITION BY calendar_id ORDER BY saved_at DESC) AS rn
    FROM public.calendar_drafts
  ) ranked
  WHERE rn > 25
);
