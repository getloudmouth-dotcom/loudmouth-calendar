CREATE TABLE freshbooks_tokens (
  account_id TEXT PRIMARY KEY,
  access_token TEXT,
  refresh_token TEXT NOT NULL,
  expires_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE freshbooks_tokens ENABLE ROW LEVEL SECURITY;
