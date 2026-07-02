const pool = require('../db');

function httpError(statusCode, message) {
  const err = new Error(message);
  err.statusCode = statusCode;
  return err;
}

async function getCategories(storeId) {
  const result = await pool.query(
    `
    SELECT
      c.id,
      c.name,
      c.slug,
      c.parent_id AS "parentId",
      COUNT(p.id)::int AS "productCount"
    FROM categories c
    LEFT JOIN products p
      ON p.category_id = c.id
      AND p.store_id = c.store_id
    WHERE c.store_id = $1
    GROUP BY c.id
    ORDER BY c.name;
    `,
    [storeId],
  );

  return result.rows;
}

async function createCategory(storeId, category) {
  const { name, slug, parentId, parent_id } = category;
  const parentIdValue = parentId || parent_id || null;

  if (!name) {
    throw httpError(400, 'name is required');
  }

  if (parentIdValue) {
    const parent = await pool.query(
      `
      SELECT id
      FROM categories
      WHERE store_id = $1
        AND id = $2;
      `,
      [storeId, parentIdValue],
    );

    if (!parent.rows[0]) {
      throw httpError(400, 'parent category must belong to this store');
    }
  }

  const result = await pool.query(
    `
    INSERT INTO categories
      (store_id, name, slug, parent_id)
    VALUES
      ($1, $2, $3, $4)
    RETURNING
      id,
      name,
      slug,
      parent_id AS "parentId",
      0 AS "productCount";
    `,
    [storeId, name, slug, parentIdValue],
  );

  return result.rows[0];
}

async function updateCategory(storeId, categoryId, category) {
  const { name, slug, parentId, parent_id } = category;
  const parentIdValue = parentId || parent_id || null;

  if (!name) {
    throw httpError(400, 'name is required');
  }

  if (parentIdValue) {
    const parent = await pool.query(
      `
      SELECT id
      FROM categories
      WHERE store_id = $1
        AND id = $2
        AND id <> $3;
      `,
      [storeId, parentIdValue, categoryId],
    );

    if (!parent.rows[0]) {
      throw httpError(400, 'parent category must belong to this store');
    }
  }

  const result = await pool.query(
    `
    UPDATE categories
    SET name = $3,
        slug = $4,
        parent_id = $5,
        updated_at = NOW()
    WHERE store_id = $1
      AND id = $2
    RETURNING *;
    `,
    [storeId, categoryId, name, slug, parentIdValue],
  );

  return result.rows[0];
}

async function deleteCategory(storeId, categoryId) {
  const usage = await pool.query(
    `
    SELECT
      (SELECT COUNT(*)::int FROM products WHERE store_id = $1 AND category_id = $2) AS products,
      (SELECT COUNT(*)::int FROM categories WHERE store_id = $1 AND parent_id = $2) AS children;
    `,
    [storeId, categoryId],
  );

  if (usage.rows[0].products > 0) {
    throw httpError(409, 'Cannot delete category while products are assigned to it');
  }

  if (usage.rows[0].children > 0) {
    throw httpError(409, 'Cannot delete category while child categories use it');
  }

  const result = await pool.query(
    `
    DELETE FROM categories
    WHERE store_id = $1
      AND id = $2
    RETURNING *;
    `,
    [storeId, categoryId],
  );

  return result.rows[0];
}

module.exports = {
  getCategories,
  createCategory,
  updateCategory,
  deleteCategory,
};
