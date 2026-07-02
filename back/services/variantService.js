const pool = require('../db');

function httpError(statusCode, message) {
  const err = new Error(message);
  err.statusCode = statusCode;
  return err;
}

async function getVariants(storeId, productId) {
  const result = await pool.query(
    `
    SELECT pv.*
    FROM product_variants pv
    JOIN products p
      ON p.id = pv.product_id
    WHERE pv.product_id = $2
      AND p.store_id = $1
    ORDER BY pv.created_at ASC;
    `,
    [storeId, productId],
  );

  return result.rows;
}
async function createVariant(storeId, productId, variant) {
  const { sku, price, stock } = variant;

  if (price === undefined || stock === undefined) {
    throw httpError(400, 'price and stock are required');
  }

  const productResult = await pool.query(
    `
    SELECT id
    FROM products
    WHERE id = $2
      AND store_id = $1;
    `,
    [storeId, productId],
  );

  if (!productResult.rows[0]) {
    throw httpError(404, 'Product not found in this store');
  }

  const result = await pool.query(
    `
    INSERT INTO product_variants
      (product_id, sku, price, stock)
    VALUES
      ($1, $2, $3, $4)
    RETURNING *;
    `,
    [productId, sku, price, stock],
  );

  return result.rows[0];
}
async function updateVariant(storeId, variantId, variant) {
  const { sku, price, stock } = variant;

  if (price === undefined || stock === undefined) {
    throw httpError(400, 'price and stock are required');
  }

  const result = await pool.query(
    `
    UPDATE product_variants pv
    SET sku = $2,
        price = $3,
        stock = $4,
        updated_at = NOW()
    FROM products p
    WHERE pv.id = $1
      AND pv.product_id = p.id
      AND p.store_id = $5
    RETURNING pv.*;
    `,
    [variantId, sku, price, stock, storeId],
  );

  return result.rows[0];
}
async function deleteVariant(storeId, variantId) {
  const result = await pool.query(
    `
    DELETE FROM product_variants pv
    USING products p
    WHERE pv.product_id = p.id
      AND p.store_id = $1
      AND pv.id = $2
    RETURNING pv.*;
    `,
    [storeId, variantId],
  );

  return result.rows[0];
}
module.exports = {
  getVariants,
  createVariant,
  updateVariant,
  deleteVariant,
};
