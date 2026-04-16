-- Migration: Billing Platform — clients, invoices, service_catalog, and related tables
-- Also: adds 'account_manager' role and 'billing' tool key to existing constraint tables.
-- Safe to re-run (uses IF NOT EXISTS / OR REPLACE patterns).

-- ── 1. Add 'account_manager' to profiles.role CHECK ──────────────────────────
-- PostgreSQL requires DROP + ADD to modify a CHECK constraint.
ALTER TABLE profiles DROP CONSTRAINT IF EXISTS profiles_role_check;
ALTER TABLE profiles ADD CONSTRAINT profiles_role_check
  CHECK (role IN ('admin', 'smm', 'designer', 'client', 'account_manager'));

-- ── 2. Add 'billing' to user_tool_access.tool_key CHECK ──────────────────────
ALTER TABLE user_tool_access DROP CONSTRAINT IF EXISTS user_tool_access_tool_key_check;
ALTER TABLE user_tool_access ADD CONSTRAINT user_tool_access_tool_key_check
  CHECK (tool_key IN ('calendar_creator', 'content_scheduling', 'admin_portal', 'content_plan', 'billing'));

-- ── 3. Helper: can_access_billing() ──────────────────────────────────────────
CREATE OR REPLACE FUNCTION can_access_billing()
RETURNS boolean AS $$
  SELECT EXISTS (
    SELECT 1 FROM profiles
    WHERE id = auth.uid()
      AND role IN ('admin', 'account_manager')
      AND status = 'active'
  );
$$ LANGUAGE sql SECURITY DEFINER STABLE;

-- ── 4. clients ────────────────────────────────────────────────────────────────
-- Central client contact table shared across all tools (billing, calendar, content plan).
CREATE TABLE IF NOT EXISTS clients (
  id                    uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at            timestamptz DEFAULT now(),
  name                  text        NOT NULL,
  email                 text,
  phone                 text,        -- E.164 format: +1XXXXXXXXXX
  company               text,
  freshbooks_contact_id text        UNIQUE,
  created_by            uuid        REFERENCES auth.users(id),
  updated_at            timestamptz DEFAULT now()
);

ALTER TABLE clients ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  DROP POLICY IF EXISTS clients_select_authenticated ON clients;
  DROP POLICY IF EXISTS clients_insert_billing       ON clients;
  DROP POLICY IF EXISTS clients_update_billing       ON clients;
  DROP POLICY IF EXISTS clients_delete_admin         ON clients;
EXCEPTION WHEN OTHERS THEN NULL; END $$;

-- All authenticated users can read clients (calendar creator, content plan, etc. need names)
CREATE POLICY clients_select_authenticated ON clients
  FOR SELECT USING (auth.uid() IS NOT NULL);

-- Only admin/account_manager can create or update clients
CREATE POLICY clients_insert_billing ON clients
  FOR INSERT WITH CHECK (can_access_billing());

CREATE POLICY clients_update_billing ON clients
  FOR UPDATE USING (can_access_billing());

-- Only admins can delete clients
CREATE POLICY clients_delete_admin ON clients
  FOR DELETE USING (is_admin());

-- ── 5. service_catalog ────────────────────────────────────────────────────────
-- Preset services with default prices. Mapped to FreshBooks item IDs.
CREATE TABLE IF NOT EXISTS service_catalog (
  id                  uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at          timestamptz DEFAULT now(),
  name                text        NOT NULL,
  description         text,
  default_price       numeric(10,2),
  unit                text        NOT NULL DEFAULT 'month', -- month | post | hour | flat
  freshbooks_item_id  text,
  category            text        NOT NULL DEFAULT 'Other'
                      CHECK (category IN ('SMM', 'Video', 'Listing', 'Other')),
  is_active           boolean     NOT NULL DEFAULT true
);

ALTER TABLE service_catalog ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  DROP POLICY IF EXISTS catalog_select_authenticated ON service_catalog;
  DROP POLICY IF EXISTS catalog_write_admin          ON service_catalog;
EXCEPTION WHEN OTHERS THEN NULL; END $$;

CREATE POLICY catalog_select_authenticated ON service_catalog
  FOR SELECT USING (auth.uid() IS NOT NULL);

CREATE POLICY catalog_write_admin ON service_catalog
  FOR ALL USING (is_admin());

-- ── 6. invoices ───────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS invoices (
  id                    uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at            timestamptz DEFAULT now(),
  client_id             uuid        NOT NULL REFERENCES clients(id),
  created_by            uuid        REFERENCES auth.users(id),
  freshbooks_invoice_id text        UNIQUE,
  status                text        NOT NULL DEFAULT 'draft'
                        CHECK (status IN ('draft', 'sent', 'viewed', 'paid', 'overdue', 'cancelled')),
  invoice_number        text        UNIQUE, -- LM-001, LM-002, etc.
  issue_date            date        NOT NULL,
  due_date              date        NOT NULL,
  subtotal              numeric(10,2),
  tax_rate              numeric(5,2) NOT NULL DEFAULT 0,
  tax_amount            numeric(10,2) NOT NULL DEFAULT 0,
  total                 numeric(10,2),
  currency              text        NOT NULL DEFAULT 'USD',
  notes                 text,
  payment_url           text,       -- FreshBooks hosted Stripe payment link
  sent_at               timestamptz,
  paid_at               timestamptz,
  is_recurring          boolean     NOT NULL DEFAULT false,
  recurrence_rule       text        CHECK (recurrence_rule IN ('monthly', 'quarterly', 'yearly')),
  next_invoice_date     date        -- when to auto-generate the next recurring invoice
);

ALTER TABLE invoices ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  DROP POLICY IF EXISTS invoices_select_billing ON invoices;
  DROP POLICY IF EXISTS invoices_write_billing  ON invoices;
  DROP POLICY IF EXISTS invoices_delete_admin   ON invoices;
EXCEPTION WHEN OTHERS THEN NULL; END $$;

CREATE POLICY invoices_select_billing ON invoices
  FOR SELECT USING (can_access_billing());

CREATE POLICY invoices_write_billing ON invoices
  FOR ALL USING (can_access_billing());

CREATE POLICY invoices_delete_admin ON invoices
  FOR DELETE USING (is_admin());

-- ── 7. invoice_line_items ─────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS invoice_line_items (
  id                  uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  invoice_id          uuid        NOT NULL REFERENCES invoices(id) ON DELETE CASCADE,
  service_catalog_id  uuid        REFERENCES service_catalog(id), -- nullable for custom items
  description         text        NOT NULL,
  quantity            numeric(10,2) NOT NULL DEFAULT 1,
  unit_price          numeric(10,2) NOT NULL,
  line_total          numeric(10,2) GENERATED ALWAYS AS (quantity * unit_price) STORED,
  sort_order          int         NOT NULL DEFAULT 0
);

ALTER TABLE invoice_line_items ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  DROP POLICY IF EXISTS line_items_select_billing ON invoice_line_items;
  DROP POLICY IF EXISTS line_items_write_billing  ON invoice_line_items;
EXCEPTION WHEN OTHERS THEN NULL; END $$;

CREATE POLICY line_items_select_billing ON invoice_line_items
  FOR SELECT USING (can_access_billing());

CREATE POLICY line_items_write_billing ON invoice_line_items
  FOR ALL USING (can_access_billing());

-- ── 8. invoice_events ─────────────────────────────────────────────────────────
-- Append-only audit log. Written by service role (server-side only).
CREATE TABLE IF NOT EXISTS invoice_events (
  id          uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at  timestamptz DEFAULT now(),
  invoice_id  uuid        NOT NULL REFERENCES invoices(id),
  event_type  text        NOT NULL
              CHECK (event_type IN ('created', 'sent', 'viewed', 'paid', 'overdue', 'cancelled', 'reminder_sent', 'updated')),
  actor       text        NOT NULL DEFAULT 'system', -- system | admin | account_manager | client | freshbooks_webhook
  metadata    jsonb
);

ALTER TABLE invoice_events ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  DROP POLICY IF EXISTS events_select_billing ON invoice_events;
EXCEPTION WHEN OTHERS THEN NULL; END $$;

-- Read-only for billing admins; no client-side writes (server uses service role key)
CREATE POLICY events_select_billing ON invoice_events
  FOR SELECT USING (can_access_billing());

-- ── 9. Invoice number sequence helper ─────────────────────────────────────────
-- Generates LM-001, LM-002, etc. using a dedicated sequence.
CREATE SEQUENCE IF NOT EXISTS invoice_number_seq START 1;

CREATE OR REPLACE FUNCTION next_invoice_number()
RETURNS text AS $$
  SELECT 'LM-' || LPAD(nextval('invoice_number_seq')::text, 3, '0');
$$ LANGUAGE sql;
