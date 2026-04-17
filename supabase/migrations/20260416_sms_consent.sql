-- Migration: SMS consent tracking
-- Employees: phone + consent timestamp on profiles
ALTER TABLE profiles
  ADD COLUMN IF NOT EXISTS phone text,
  ADD COLUMN IF NOT EXISTS sms_consent_at timestamptz;

-- Clients: consent timestamp + one-time opt-in token (phone already exists)
ALTER TABLE clients
  ADD COLUMN IF NOT EXISTS sms_consent_at timestamptz,
  ADD COLUMN IF NOT EXISTS sms_optin_token text UNIQUE;
