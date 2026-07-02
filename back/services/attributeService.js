const pool = require('../db');

function httpError(statusCode, message) {
  const err = new Error(message);
  err.statusCode = statusCode;
  return err;
}

async function createAttribute(storeId, attribute) {
  const name = typeof attribute === 'string' ? attribute : attribute.name;
  const type = typeof attribute === 'string' ? 'select' : attribute.type || 'select';

  const result = await pool.query(
    `
    INSERT INTO attributes (store_id, name, type)
    VALUES ($1, $2, $3)
    RETURNING *;
    `,
    [storeId, name, type],
  );

  return result.rows[0];
}
async function getAttributes(storeId) {
  const result = await pool.query(
    `
    SELECT
      a.id,
      a.name,
      a.type,
      (
        SELECT COALESCE(json_agg(value ORDER BY value), '[]')
        FROM (
          SELECT DISTINCT av.value
          FROM attribute_values av
          WHERE av.attribute_id = a.id
        ) distinct_values
      ) AS values,
      (
        SELECT COUNT(DISTINCT vav.variant_id)::int
        FROM attribute_values av
        JOIN variant_attribute_values vav
          ON vav.attribute_value_id = av.id
        WHERE av.attribute_id = a.id
      ) AS "usedIn"
    FROM attributes a
    WHERE a.store_id = $1
    ORDER BY a.created_at DESC;
    `,
    [storeId],
  );

  return result.rows;
}
async function createAttributeValue(storeId, attributeId, value) {
  const attributeResult = await pool.query(
    `
    SELECT id
    FROM attributes
    WHERE store_id = $1
      AND id = $2;
    `,
    [storeId, attributeId],
  );

  if (!attributeResult.rows[0]) {
    throw httpError(404, 'Attribute not found in this store');
  }

  const result = await pool.query(
    `
    INSERT INTO attribute_values (attribute_id, value)
    VALUES ($1, $2)
    RETURNING *;
    `,
    [attributeId, value],
  );

  return result.rows[0];
}
async function getAttributeValues(storeId, attributeId) {
  const result = await pool.query(
    `
    SELECT av.*
    FROM attribute_values av
    JOIN attributes a
      ON a.id = av.attribute_id
    WHERE av.attribute_id = $2
      AND a.store_id = $1
    ORDER BY av.created_at ASC;
    `,
    [storeId, attributeId],
  );

  return result.rows;
}

async function updateAttributeValue(storeId, valueId, value) {
  const result = await pool.query(
    `
    UPDATE attribute_values av
    SET value = $3
    FROM attributes a
    WHERE av.attribute_id = a.id
      AND a.store_id = $1
      AND av.id = $2
    RETURNING av.*;
    `,
    [storeId, valueId, value],
  );

  return result.rows[0];
}

async function deleteAttribute(storeId, attributeId) {
  const result = await pool.query(
    `
    DELETE FROM attributes
    WHERE store_id = $1
      AND id = $2
    RETURNING *;
    `,
    [storeId, attributeId],
  );

  return result.rows[0];
}

module.exports = {
  createAttribute,
  getAttributes,
  createAttributeValue,
  getAttributeValues,
  updateAttributeValue,
  deleteAttribute,
};
