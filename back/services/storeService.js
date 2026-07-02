const pool = require('../db');

async function getStores() {
  const result = await pool.query(`
    SELECT
      s.id,
      s.name,
      s.domain,
      s.status,
      s.created_at,
      s.updated_at,

      COUNT(DISTINCT p.id) AS "productsCount",
      COUNT(DISTINCT pv.id) AS "variantsCount",
      COUNT(DISTINCT c.id) AS "categoriesCount",
      COUNT(DISTINCT b.id) AS "brandsCount"

    FROM stores s

    LEFT JOIN products p
      ON p.store_id = s.id

    LEFT JOIN product_variants pv
      ON pv.product_id = p.id

    LEFT JOIN categories c
      ON c.store_id = s.id

    LEFT JOIN brands b
      ON b.store_id = s.id

    GROUP BY
      s.id,
      s.name,
      s.domain,
      s.status,
      s.created_at,
      s.updated_at

    ORDER BY s.name;
  `);

  return result.rows;
}

async function createStore(store) {
  const { name, domain, status = 'active' } = store;

  const result = await pool.query(
    `
    INSERT INTO stores (name, domain, status)
    VALUES ($1, $2, $3)
    RETURNING *;
    `,
    [name, domain, status],
  );

  return result.rows[0];
}

async function deleteStore(storeId) {
  const result = await pool.query(
    `
    DELETE FROM stores
    WHERE id = $1
    RETURNING *;
    `,
    [storeId],
  );

  return result.rows[0];
}

module.exports = {
  getStores,
  createStore,
  deleteStore,
};
