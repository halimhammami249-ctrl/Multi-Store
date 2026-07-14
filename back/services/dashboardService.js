const pool = require('../db');

async function getPlatformStats() {
  const result = await pool.query(`
    SELECT
      (SELECT COUNT(*) FROM stores) AS "totalStores",
      (SELECT COUNT(*) FROM stores WHERE status='active') AS "activeStores",
      (SELECT COUNT(*) FROM products) AS "totalProducts",
      (SELECT COUNT(*) FROM product_variants) AS "totalVariants",
      (SELECT COUNT(*) FROM brands) AS "totalBrands",
      (SELECT COUNT(*) FROM categories) AS "totalCategories",
      (
        SELECT COUNT(*)
        FROM product_variants
        WHERE stock <= 50
      ) AS "lowStock",
      (
        SELECT COALESCE(SUM(stock),0)
        FROM product_variants
      ) AS "totalInventory",
      (
        SELECT COALESCE(JSON_AGG(activity), '[]')
        FROM (
          SELECT
            id,
            name,
            (created_at >= updated_at - INTERVAL '2 seconds') AS "isNew",
            GREATEST(created_at, updated_at) AS "at"
          FROM stores
          ORDER BY GREATEST(created_at, updated_at) DESC
          LIMIT 5
        ) activity
      ) AS "recentActivity";
  `);

  return result.rows[0];
}

async function getStoreStats(storeId) {
  const result = await pool.query(
    `
    SELECT
      (SELECT COUNT(*) FROM products WHERE store_id=$1) AS "totalProducts",

      (
        SELECT COUNT(*)
        FROM product_variants pv
        JOIN products p
          ON p.id=pv.product_id
        WHERE p.store_id=$1
      ) AS "totalVariants",

      (
        SELECT COUNT(*)
        FROM product_variants pv
        JOIN products p
          ON p.id=pv.product_id
        WHERE p.store_id=$1
        AND pv.stock<=50
      ) AS "lowStock",

      (
        SELECT COALESCE(SUM(pv.stock),0)
        FROM product_variants pv
        JOIN products p
          ON p.id=pv.product_id
        WHERE p.store_id=$1
      ) AS "totalInventory",

      (
        SELECT COALESCE(JSON_AGG(activity), '[]')
        FROM (
          SELECT
            id,
            name,
            (created_at >= updated_at - INTERVAL '2 seconds') AS "isNew",
            GREATEST(created_at, updated_at) AS "at"
          FROM products
          WHERE store_id=$1
          ORDER BY GREATEST(created_at, updated_at) DESC
          LIMIT 5
        ) activity
      ) AS "recentActivity";
`,
    [storeId],
  );

  return result.rows[0];
}

module.exports = {
  getPlatformStats,
  getStoreStats,
};
