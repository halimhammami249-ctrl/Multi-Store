const pool = require('../db');

function httpError(statusCode, message) {
  const err = new Error(message);
  err.statusCode = statusCode;
  return err;
}

function slugify(value) {
  return String(value || '')
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '');
}

async function getProducts(storeId) {
  const result = await pool.query(
    `
    SELECT
      p.id,
      p.name,
      p.slug,
      p.description,
      p.brand_id AS "brandId",
      p.category_id AS "categoryId",
      COALESCE(b.name, 'No brand') AS brand,
      COALESCE(c.name, 'Uncategorized') AS category,
      COUNT(DISTINCT pv.id)::int AS "variantCount",
      CASE
        WHEN COUNT(pv.id) = 0 THEN '$0.00'
        WHEN MIN(pv.price) = MAX(pv.price) THEN '$' || TO_CHAR(MIN(pv.price), 'FM999999990.00')
        ELSE '$' || TO_CHAR(MIN(pv.price), 'FM999999990.00') || ' - $' || TO_CHAR(MAX(pv.price), 'FM999999990.00')
      END AS "priceRange",
      COALESCE(SUM(pv.stock), 0)::int AS "totalStock",
      p.status,
      TO_CHAR(p.created_at, 'YYYY-MM-DD') AS "createdDate"
    FROM products p
    LEFT JOIN brands b
      ON p.brand_id = b.id
    LEFT JOIN categories c
      ON p.category_id = c.id

    LEFT JOIN product_variants pv
      ON pv.product_id = p.id

    WHERE p.store_id = $1

    GROUP BY
      p.id,
      b.name,
      c.name
    ORDER BY p.created_at DESC;
    `,
    [storeId],
  );

  return result.rows;
}
async function createProduct(storeId, product) {
  const {
    name,
    slug,
    description = null,
    brand_id,
    brandId,
    category_id,
    categoryId,
    status = 'active',
  } = product;
  const brandIdValue = brand_id || brandId;
  const categoryIdValue = category_id || categoryId;

  if (!name || !brandIdValue || !categoryIdValue) {
    throw httpError(400, 'name, brand_id and category_id are required');
  }

  const parentResult = await pool.query(
    `
    SELECT
      EXISTS (
        SELECT 1 FROM brands
        WHERE id = $2
          AND store_id = $1
      ) AS "brandExists",
      EXISTS (
        SELECT 1 FROM categories
        WHERE id = $3
          AND store_id = $1
      ) AS "categoryExists";
    `,
    [storeId, brandIdValue, categoryIdValue],
  );
  const parent = parentResult.rows[0];

  if (!parent.brandExists) {
    throw httpError(400, 'brand_id must belong to this store');
  }

  if (!parent.categoryExists) {
    throw httpError(400, 'category_id must belong to this store');
  }

  const result = await pool.query(
    `
    INSERT INTO products
      (store_id, name, slug, description, brand_id, category_id, status)

    VALUES
      ($1, $2, $3, $4, $5, $6, $7)

    RETURNING *;
    `,
    [
      storeId,
      name,
      slug || slugify(name),
      description,
      brandIdValue,
      categoryIdValue,
      status,
    ],
  );

  return result.rows[0];
}
async function getProductById(storeId, productId) {
  const result = await pool.query(
    `
    SELECT
      p.id,
      p.name,
      p.slug,
      p.description,
      p.brand_id,
      p.category_id,
      p.status,

      COALESCE(
        json_agg(
          DISTINCT jsonb_build_object(
            'id', pv.id,
            'price', pv.price,
            'stock', pv.stock,
            'sku', pv.sku
          )
        ) FILTER (WHERE pv.id IS NOT NULL),
        '[]'
      ) AS variants

    FROM products p

    LEFT JOIN product_variants pv
      ON pv.product_id = p.id

    WHERE
      p.store_id = $1
      AND p.id = $2

    GROUP BY p.id;
    `,
    [storeId, productId],
  );

  return result.rows[0];
}
async function updateProduct(storeId, productId, product) {
  const {
    name,
    slug,
    description = null,
    brand_id,
    brandId,
    category_id,
    categoryId,
    status = 'active',
  } = product;
  const brandIdValue = brand_id || brandId;
  const categoryIdValue = category_id || categoryId;

  if (!name || !brandIdValue || !categoryIdValue) {
    throw httpError(400, 'name, brand_id and category_id are required');
  }

  const parentResult = await pool.query(
    `
    SELECT
      EXISTS (
        SELECT 1 FROM products
        WHERE id = $2
          AND store_id = $1
      ) AS "productExists",
      EXISTS (
        SELECT 1 FROM brands
        WHERE id = $3
          AND store_id = $1
      ) AS "brandExists",
      EXISTS (
        SELECT 1 FROM categories
        WHERE id = $4
          AND store_id = $1
      ) AS "categoryExists";
    `,
    [storeId, productId, brandIdValue, categoryIdValue],
  );
  const parent = parentResult.rows[0];

  if (!parent.productExists) {
    throw httpError(404, 'Product not found in this store');
  }

  if (!parent.brandExists) {
    throw httpError(400, 'brand_id must belong to this store');
  }

  if (!parent.categoryExists) {
    throw httpError(400, 'category_id must belong to this store');
  }

  const result = await pool.query(
    `
    UPDATE products
    SET
      name = $3,
      slug = $4,
      description = $5,
      brand_id = $6,
      category_id = $7,
      status = $8,
      updated_at = NOW()

    WHERE
      store_id = $1
      AND id = $2

    RETURNING *;
    `,
    [
      storeId,
      productId,
      name,
      slug || slugify(name),
      description,
      brandIdValue,
      categoryIdValue,
      status,
    ],
  );

  return result.rows[0];
}
async function deleteProduct(storeId, productId) {
  const result = await pool.query(
    `
    DELETE FROM products
    WHERE
      store_id = $1
      AND id = $2

    RETURNING *;
    `,
    [storeId, productId],
  );

  return result.rows[0];
}
module.exports = {
  getProducts,
  createProduct,
  getProductById,
  updateProduct,
  deleteProduct,
};
