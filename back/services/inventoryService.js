const pool = require('../db');

async function getInventory(storeId) {
  const result = await pool.query(
    `
    SELECT
      pv.id,
      p.id AS "productId",
      pv.sku,
      p.name AS product,
      COALESCE(
        STRING_AGG(a.name || ': ' || av.value, ' / ' ORDER BY a.name),
        ''
      ) AS attributes,
      pv.price::float AS price,
      pv.stock,
      pv.status
    FROM product_variants pv
    JOIN products p
      ON p.id = pv.product_id
    LEFT JOIN variant_attribute_values vav
      ON vav.variant_id = pv.id
    LEFT JOIN attribute_values av
      ON av.id = vav.attribute_value_id
    LEFT JOIN attributes a
      ON a.id = av.attribute_id
    WHERE p.store_id = $1
    GROUP BY
      pv.id,
      p.id,
      pv.sku,
      p.name,
      pv.price,
      pv.stock,
      pv.status,
      pv.created_at
    ORDER BY pv.created_at DESC;
    `,
    [storeId],
  );

  return result.rows;
}

async function updateInventory(storeId, variantId, stock) {
  const result = await pool.query(
    `
    UPDATE product_variants pv
    SET stock = $2,
        updated_at = NOW()
    FROM products p
    WHERE pv.id = $1
      AND pv.product_id = p.id
      AND p.store_id = $3
    RETURNING pv.*;
    `,
    [variantId, stock, storeId],
  );

  return result.rows[0];
}

module.exports = {
  getInventory,
  updateInventory,
};
