-- Add smm_active flag to clients table.
-- Controls whether a client appears in the sidebar SMM workflow.
-- One-off / invoicing-only clients can be hidden by setting this to false.
ALTER TABLE clients
  ADD COLUMN IF NOT EXISTS smm_active boolean NOT NULL DEFAULT true;
