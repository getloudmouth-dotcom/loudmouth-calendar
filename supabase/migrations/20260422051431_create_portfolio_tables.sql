CREATE TABLE IF NOT EXISTS portfolio_categories (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name            text NOT NULL,
  slug            text NOT NULL UNIQUE,
  cover_image_url text,
  display_order   integer NOT NULL DEFAULT 0,
  published       boolean NOT NULL DEFAULT true,
  created_at      timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE portfolio_categories ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public read published categories"
  ON portfolio_categories FOR SELECT
  USING (published = true);

CREATE TABLE IF NOT EXISTS portfolio_items (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  category_id     uuid REFERENCES portfolio_categories(id) ON DELETE SET NULL,
  youtube_url     text NOT NULL,
  client_name     text,
  title           text,
  description     text,
  category        text,
  tags            text[],
  thumbnail_url   text,
  featured        boolean NOT NULL DEFAULT false,
  display_order   integer NOT NULL DEFAULT 0,
  published       boolean NOT NULL DEFAULT true,
  created_at      timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE portfolio_items ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public read published portfolio items"
  ON portfolio_items FOR SELECT
  USING (published = true);

CREATE INDEX IF NOT EXISTS portfolio_items_category_id_idx
  ON portfolio_items (category_id);
