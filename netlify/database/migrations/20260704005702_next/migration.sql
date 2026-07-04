CREATE UNIQUE INDEX IF NOT EXISTS uq_brands_store_lower_name
  ON brands (store_id, LOWER(name));

CREATE UNIQUE INDEX IF NOT EXISTS uq_categories_store_lower_name
  ON categories (store_id, LOWER(name));