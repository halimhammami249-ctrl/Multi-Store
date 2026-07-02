const pool = require('../db');

function httpError(statusCode, message) {
  const err = new Error(message);
  err.statusCode = statusCode;
  return err;
}

async function linkVariantAttribute(storeId, variant_id, attribute_value_id) {
  const ownership = await pool.query(
    `
    SELECT
      EXISTS (
        SELECT 1
        FROM product_variants pv
        JOIN products p
          ON p.id = pv.product_id
        WHERE pv.id = $2
          AND p.store_id = $1
      ) AS "variantExists",
      EXISTS (
        SELECT 1
        FROM attribute_values av
        JOIN attributes a
          ON a.id = av.attribute_id
        WHERE av.id = $3
          AND a.store_id = $1
      ) AS "valueExists";
    `,
    [storeId, variant_id, attribute_value_id],
  );
  const row = ownership.rows[0];

  if (!row.variantExists) {
    throw httpError(404, 'Variant not found in this store');
  }

  if (!row.valueExists) {
    throw httpError(404, 'Attribute value not found in this store');
  }

  const result = await pool.query(
    `
    INSERT INTO variant_attribute_values
      (variant_id, attribute_value_id)
    VALUES ($1, $2)
    ON CONFLICT (variant_id, attribute_value_id) DO NOTHING
    RETURNING *;
    `,
    [variant_id, attribute_value_id],
  );

  return result.rows[0];
}
async function getVariantAttributes(storeId, variant_id) {
  const result = await pool.query(
    `
    SELECT 
      a.name AS attribute_name,
      av.value AS attribute_value
    FROM variant_attribute_values vav

    JOIN attribute_values av
      ON av.id = vav.attribute_value_id

    JOIN attributes a
      ON a.id = av.attribute_id

    JOIN product_variants pv
      ON pv.id = vav.variant_id

    JOIN products p
      ON p.id = pv.product_id

    WHERE vav.variant_id = $2
      AND p.store_id = $1;
    `,
    [storeId, variant_id],
  );

  return result.rows;
}
module.exports = {
  linkVariantAttribute,
  getVariantAttributes,
};
