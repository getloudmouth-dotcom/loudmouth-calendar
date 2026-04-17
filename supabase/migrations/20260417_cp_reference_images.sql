ALTER TABLE content_plans ADD COLUMN IF NOT EXISTS reference_images text[] DEFAULT '{}';
