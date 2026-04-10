-- content_plans: stores content plan metadata
CREATE TABLE IF NOT EXISTS content_plans (
  id          uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     uuid        NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  client_name text        NOT NULL,
  month       int         NOT NULL CHECK (month BETWEEN 0 AND 11),
  year        int         NOT NULL,
  shoot_date  text        NOT NULL DEFAULT 'PENDING',
  created_at  timestamptz DEFAULT now(),
  updated_at  timestamptz DEFAULT now()
);

-- content_plan_items: individual rows in a content plan
CREATE TABLE IF NOT EXISTS content_plan_items (
  id              uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  plan_id         uuid        NOT NULL REFERENCES content_plans(id) ON DELETE CASCADE,
  item_type       text        NOT NULL CHECK (item_type IN ('produced', 'organic')),
  item_number     int         NOT NULL,
  title           text        NOT NULL DEFAULT '',
  whats_needed    text        NOT NULL DEFAULT '',
  reference_link  text        NOT NULL DEFAULT '',
  creator_name    text        NOT NULL DEFAULT '',
  approval_status text        NOT NULL DEFAULT 'pending'
                              CHECK (approval_status IN ('pending', 'approved', 'denied')),
  client_notes    text        NOT NULL DEFAULT '',
  updated_at      timestamptz DEFAULT now()
);

-- content_plan_shares: public share tokens (one per plan)
CREATE TABLE IF NOT EXISTS content_plan_shares (
  id                  uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  plan_id             uuid        NOT NULL REFERENCES content_plans(id) ON DELETE CASCADE,
  token               text        NOT NULL UNIQUE DEFAULT encode(gen_random_bytes(32), 'hex'),
  allow_client_notes  boolean     NOT NULL DEFAULT true,
  expires_at          timestamptz,
  created_at          timestamptz DEFAULT now(),
  UNIQUE (plan_id)
);

-- RLS: content_plans — owner can do all
ALTER TABLE content_plans ENABLE ROW LEVEL SECURITY;
CREATE POLICY cp_owner ON content_plans
  FOR ALL USING (auth.uid() = user_id);

-- RLS: content_plan_items — owner via parent plan
ALTER TABLE content_plan_items ENABLE ROW LEVEL SECURITY;
CREATE POLICY cpi_owner ON content_plan_items
  FOR ALL USING (
    EXISTS (SELECT 1 FROM content_plans
            WHERE id = content_plan_items.plan_id AND user_id = auth.uid())
  );

-- RLS: content_plan_shares — owner via parent plan
ALTER TABLE content_plan_shares ENABLE ROW LEVEL SECURITY;
CREATE POLICY cps_owner ON content_plan_shares
  FOR ALL USING (
    EXISTS (SELECT 1 FROM content_plans
            WHERE id = content_plan_shares.plan_id AND user_id = auth.uid())
  );

-- Extend user_tool_access to allow content_plan_creator key
ALTER TABLE user_tool_access DROP CONSTRAINT IF EXISTS user_tool_access_tool_key_check;
ALTER TABLE user_tool_access ADD CONSTRAINT user_tool_access_tool_key_check
  CHECK (tool_key IN ('calendar_creator', 'content_scheduling', 'admin_portal', 'content_plan_creator'));
