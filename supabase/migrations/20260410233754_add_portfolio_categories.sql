-- Portfolio categories (the clickable cards on /work)
CREATE TABLE IF NOT EXISTS portfolio_categories (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name          text NOT NULL,          -- e.g. "BEAUTY", "CORPORATE"
  slug          text NOT NULL UNIQUE,   -- e.g. "beauty", "corporate"
  cover_image_url text,                 -- thumbnail shown on the category card
  display_order integer NOT NULL DEFAULT 0,
  published     boolean NOT NULL DEFAULT true,
  created_at    timestamptz NOT NULL DEFAULT now()
);

-- Public can read published categories
ALTER TABLE portfolio_categories ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public read published categories"
  ON portfolio_categories FOR SELECT
  USING (published = true);

-- Add category_id FK and featured flag to portfolio_items
ALTER TABLE portfolio_items
  ADD COLUMN IF NOT EXISTS category_id uuid REFERENCES portfolio_categories(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS featured    boolean NOT NULL DEFAULT false;

-- Index for fast lookups by category
CREATE INDEX IF NOT EXISTS portfolio_items_category_id_idx
  ON portfolio_items (category_id);
