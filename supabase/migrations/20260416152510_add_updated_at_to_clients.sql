ALTER TABLE clients ADD COLUMN updated_at timestamptz NOT NULL DEFAULT now();
UPDATE clients SET updated_at = created_at;
CREATE TRIGGER clients_set_updated_at
  BEFORE UPDATE ON clients
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();
