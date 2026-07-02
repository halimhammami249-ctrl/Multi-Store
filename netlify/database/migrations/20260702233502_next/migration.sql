DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM products p
    WHERE NOT EXISTS (
      SELECT 1 FROM brands b
      WHERE b.id = p.brand_id
      AND b.store_id = p.store_id
    )
    OR NOT EXISTS (
      SELECT 1 FROM categories c
      WHERE c.id = p.category_id
      AND c.store_id = p.store_id
    )
  ) THEN
    RAISE EXCEPTION
    'Cannot enable strict mode: fix orphan or cross-store products first';
  END IF;
END $$;

ALTER TABLE products
  ALTER COLUMN brand_id SET NOT NULL,
  ALTER COLUMN category_id SET NOT NULL;