-- Enforce 1 content plan per (client_id, month, year).
-- Partial index because client_id is nullable (legacy plans without a linked client).
CREATE UNIQUE INDEX IF NOT EXISTS content_plans_client_month_year_unique
  ON content_plans (client_id, month, year)
  WHERE client_id IS NOT NULL;
