ALTER TABLE content_plan_shares ALTER COLUMN token SET DEFAULT encode(gen_random_bytes(8), 'hex');
