const pool = require('../db');

/**
 * Resolves a public-facing domain to an active store.
 * Returns null for unknown domains AND for inactive/suspended stores -
 * a de-listed store's storefront should 404 like it doesn't exist,
 * not leak the fact that it exists but is disabled.
 */
async function getStoreByDomain(domain) {
  const res = await pool.query(
    `
    SELECT id, name, domain, status
    FROM stores
    WHERE LOWER(domain) = LOWER($1)
      AND status = 'active'
    `,
    [domain],
  );
  return res.rows[0] || null;
}

/**
 * Product list for a storefront. One row per product, with a single
 * "primary" image (position 0 from any variant) so the grid view has
 * something to render without pulling every image for every variant.
 * Numeric price (not the "$12 - $18" formatted string the admin
 * dashboard uses) because a storefront needs to sort/filter/compute
 * with it, not just display it.
 */
async function getPublicProducts(storeId) {
  const res = await pool.query(
    `
    SELECT
      p.id,
      p.name,
      p.slug,
      p.description,
      COALESCE(b.name, NULL) AS brand,
      COALESCE(b.slug, NULL) AS "brandSlug",
      COALESCE(c.name, NULL) AS category,
      COALESCE(c.slug, NULL) AS "categorySlug",
      MIN(pv.price)::float AS "minPrice",
      MAX(pv.price)::float AS "maxPrice",
      COALESCE(SUM(pv.stock), 0)::int AS "totalStock",
      (
        SELECT pi.url
        FROM product_images pi
        JOIN product_variants pv2 ON pv2.id = pi.variant_id
        WHERE pv2.product_id = p.id
        ORDER BY pi.position ASC, pi.created_at ASC
        LIMIT 1
      ) AS image
    FROM products p
    LEFT JOIN brands b ON b.id = p.brand_id
    LEFT JOIN categories c ON c.id = p.category_id
    LEFT JOIN product_variants pv ON pv.product_id = p.id AND pv.status = 'active'
    WHERE p.store_id = $1
      AND p.status = 'active'
    GROUP BY p.id, b.name, b.slug, c.name, c.slug
    ORDER BY p.created_at DESC
    `,
    [storeId],
  );
  return res.rows;
}

/**
 * Single product detail by slug, including every variant, every image
 * per variant (not just the primary one), and each variant's attributes
 * (e.g. size/color) grouped together instead of one row per attribute.
 */
async function getPublicProductBySlug(storeId, slug) {
  const productRes = await pool.query(
    `
    SELECT
      p.id,
      p.name,
      p.slug,
      p.description,
      COALESCE(b.name, NULL) AS brand,
      COALESCE(b.slug, NULL) AS "brandSlug",
      COALESCE(c.name, NULL) AS category,
      COALESCE(c.slug, NULL) AS "categorySlug"
    FROM products p
    LEFT JOIN brands b ON b.id = p.brand_id
    LEFT JOIN categories c ON c.id = p.category_id
    WHERE p.store_id = $1
      AND p.slug = $2
      AND p.status = 'active'
    `,
    [storeId, slug],
  );

  const product = productRes.rows[0];
  if (!product) return null;

  const variantRes = await pool.query(
    `
    SELECT
      pv.id,
      pv.sku,
      pv.price::float AS price,
      pv.stock,
      a.name AS attribute_name,
      av.value AS attribute_value
    FROM product_variants pv
    LEFT JOIN variant_attribute_values vav ON vav.variant_id = pv.id
    LEFT JOIN attribute_values av ON av.id = vav.attribute_value_id
    LEFT JOIN attributes a ON a.id = av.attribute_id
    WHERE pv.product_id = $1
      AND pv.status = 'active'
    ORDER BY pv.created_at ASC
    `,
    [product.id],
  );

  const imageRes = await pool.query(
    `
    SELECT pi.variant_id, pi.url, pi.position
    FROM product_images pi
    JOIN product_variants pv ON pv.id = pi.variant_id
    WHERE pv.product_id = $1
    ORDER BY pi.position ASC, pi.created_at ASC
    `,
    [product.id],
  );

  const imagesByVariant = new Map();
  for (const img of imageRes.rows) {
    if (!imagesByVariant.has(img.variant_id))
      imagesByVariant.set(img.variant_id, []);
    imagesByVariant.get(img.variant_id).push(img.url);
  }

  const variantsById = new Map();
  for (const row of variantRes.rows) {
    if (!variantsById.has(row.id)) {
      variantsById.set(row.id, {
        id: row.id,
        sku: row.sku,
        price: row.price,
        stock: row.stock,
        attributes: {},
        images: imagesByVariant.get(row.id) || [],
      });
    }
    if (row.attribute_name) {
      variantsById.get(row.id).attributes[row.attribute_name] =
        row.attribute_value;
    }
  }

  const variants = [...variantsById.values()];

  // All images across every variant, deduped, for a top-level gallery -
  // most storefronts want "all photos of this product" up front, then
  // narrow to a variant's own photos once a variant (e.g. a color) is
  // selected.
  const allImages = [...new Set(variants.flatMap((v) => v.images))];

  return {
    ...product,
    images: allImages,
    variants,
  };
}

async function getPublicCategories(storeId) {
  const res = await pool.query(
    `
    SELECT id, name, slug, parent_id AS "parentId"
    FROM categories
    WHERE store_id = $1
    ORDER BY name ASC
    `,
    [storeId],
  );
  return res.rows;
}

async function getPublicBrands(storeId) {
  const res = await pool.query(
    `
    SELECT id, name, slug
    FROM brands
    WHERE store_id = $1
      AND is_active = TRUE
    ORDER BY name ASC
    `,
    [storeId],
  );
  return res.rows;
}

module.exports = {
  getStoreByDomain,
  getPublicProducts,
  getPublicProductBySlug,
  getPublicCategories,
  getPublicBrands,
};
