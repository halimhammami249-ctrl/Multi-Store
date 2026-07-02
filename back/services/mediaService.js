const pool = require('../db');

async function getMedia(storeId) {
  const result = await pool.query(
    `
    SELECT
      pi.id,
      pi.url,
      pi.position,
      pi.created_at AS "createdAt",
      pv.id AS "variantId",
      pv.sku,
      p.name AS product
    FROM product_images pi
    JOIN product_variants pv
      ON pv.id = pi.variant_id
    JOIN products p
      ON p.id = pv.product_id
    WHERE p.store_id = $1
    ORDER BY pi.position ASC, pi.created_at DESC;
    `,
    [storeId],
  );

  return result.rows;
}

async function createMedia(storeId, media) {
  const { sku, variantId, url, position = 0 } = media;

  let targetVariantId = variantId;

  if (!targetVariantId && sku) {
    const variant = await pool.query(
      `
      SELECT pv.id
      FROM product_variants pv
      JOIN products p
        ON p.id = pv.product_id
      WHERE p.store_id = $1
        AND pv.sku = $2;
      `,
      [storeId, sku],
    );

    targetVariantId = variant.rows[0]?.id;
  }

  if (!targetVariantId) {
    return null;
  }

  const result = await pool.query(
    `
    INSERT INTO product_images (variant_id, url, position)
    VALUES ($1, $2, $3)
    RETURNING *;
    `,
    [targetVariantId, url, position],
  );

  return result.rows[0];
}

async function deleteMedia(storeId, mediaId) {
  const result = await pool.query(
    `
    DELETE FROM product_images pi
    USING product_variants pv, products p
    WHERE pi.variant_id = pv.id
      AND pv.product_id = p.id
      AND p.store_id = $1
      AND pi.id = $2
    RETURNING pi.*;
    `,
    [storeId, mediaId],
  );

  return result.rows[0];
}

module.exports = {
  getMedia,
  createMedia,
  deleteMedia,
};
