const pool = require('../db');

function httpError(statusCode, message) {
  const err = new Error(message);
  err.statusCode = statusCode;
  return err;
}

async function getBrands(storeId) {
  const result = await pool.query(
    `
  SELECT
    b.id,
    b.name,
    COUNT(DISTINCT p.id) AS "productCount",
    b.is_active AS "isActive"

  FROM brands b
  LEFT JOIN products p
    ON p.brand_id = b.id

  WHERE b.store_id = $1

  GROUP BY
    b.id,
    b.name,
    b.is_active

  ORDER BY b.name;
  `,
    [storeId],
  );

  return result.rows;
}

async function createBrand(storeId, brand) {
  const { name, slug, isActive, is_active } = brand;
  const active = isActive ?? is_active ?? true;

  if (!name) {
    throw httpError(400, 'name is required');
  }

  const result = await pool.query(
    `
    INSERT INTO brands
      (store_id, name, slug, is_active)

    VALUES
      ($1, $2, $3, $4)

    RETURNING *;
    `,
    [storeId, name, slug, active],
  );

  return result.rows[0];
}

async function updateBrand(storeId, brandId, brand) {
  const { name, slug, isActive, is_active } = brand;
  const active = isActive ?? is_active ?? true;

  if (!name) {
    throw httpError(400, 'name is required');
  }

  const result = await pool.query(
    `
    UPDATE brands
    SET name = $3,
        slug = $4,
        is_active = $5,
        updated_at = NOW()
    WHERE store_id = $1
      AND id = $2
    RETURNING *;
    `,
    [storeId, brandId, name, slug, active],
  );

  return result.rows[0];
}

async function deleteBrand(storeId, brandId) {
  const usage = await pool.query(
    `
    SELECT COUNT(*)::int AS count
    FROM products
    WHERE store_id = $1
      AND brand_id = $2;
    `,
    [storeId, brandId],
  );

  if (usage.rows[0].count > 0) {
    throw httpError(409, 'Cannot delete brand while products are assigned to it');
  }

  const result = await pool.query(
    `
    DELETE FROM brands
    WHERE store_id = $1
      AND id = $2
    RETURNING *;
    `,
    [storeId, brandId],
  );

  return result.rows[0];
}

module.exports = {
  getBrands,
  createBrand,
  updateBrand,
  deleteBrand,
};
