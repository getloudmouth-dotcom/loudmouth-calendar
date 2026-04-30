-- Migration: client-centric architecture
-- Adds client_id FK to calendars, prev_calendar_id for month chaining,
-- and calendar_id FK to content_plans so all work tools share one context.

-- 1. Add client_id FK to calendars (nullable; backfilled below)
ALTER TABLE calendars
  ADD COLUMN IF NOT EXISTS client_id uuid REFERENCES clients(id) ON DELETE SET NULL;

-- Backfill: match existing calendars to clients by name (case-insensitive)
UPDATE calendars c
SET client_id = cl.id
FROM clients cl
WHERE lower(c.client_name) = lower(cl.name)
  AND c.client_id IS NULL;

-- 2. Add prev_calendar_id for month-to-month chaining
ALTER TABLE calendars
  ADD COLUMN IF NOT EXISTS prev_calendar_id uuid REFERENCES calendars(id) ON DELETE SET NULL;

-- 3. Link content_plans to a specific calendar month
ALTER TABLE content_plans
  ADD COLUMN IF NOT EXISTS calendar_id uuid REFERENCES calendars(id) ON DELETE SET NULL;

-- 4. Index for "all months for this client" queries (ClientPortal timeline)
CREATE INDEX IF NOT EXISTS idx_calendars_client_month
  ON calendars (client_id, year, month);
