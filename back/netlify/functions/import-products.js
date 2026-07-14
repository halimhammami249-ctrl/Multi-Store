const pool = require('../../db');
const { requireStoreAccess } = require('../../services/authService');

function json(statusCode, body) {
  return {
    statusCode,
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  };
}

exports.handler = async (event) => {
  if (event.httpMethod !== 'POST') {
    return json(405, { error: 'Method not allowed' });
  }

  // FIX: route.ts sends `?store_id=` (snake_case) but this was reading
  // `event.queryStringParameters?.storeId` (camelCase). The param was
  // always undefined, so every import request 400'd with "storeId
  // required" regardless of what store was actually selected on the
  // frontend.
  const storeId = event.queryStringParameters?.store_id;

  if (!storeId) {
    return json(400, { error: 'storeId required' });
  }

  try {
    await requireStoreAccess(event, storeId, 'write');
  } catch (err) {
    return json(err.statusCode || 401, {
      error: err.message || 'Not authenticated',
    });
  }

  let body;
  try {
    body = JSON.parse(event.body || '{}');
  } catch {
    return json(400, { error: 'Invalid JSON' });
  }

  const rows = Array.isArray(body.rows) ? body.rows : [];

  if (!rows.length) {
    return json(400, { error: 'No rows provided' });
  }

  const client = await pool.connect();

  try {
    const store = await client.query(`SELECT id FROM stores WHERE id=$1`, [
      storeId,
    ]);

    if (!store.rows[0]) {
      return json(404, { error: 'Store not found' });
    }

    await client.query('BEGIN');

    const jobRes = await client.query(
      `
      INSERT INTO import_jobs(store_id, status, total_rows)
      VALUES ($1,'processing',$2)
      RETURNING id
      `,
      [storeId, rows.length],
    );

    const jobId = jobRes.rows[0].id;

    for (let i = 0; i < rows.length; i++) {
      await client.query(
        `
        INSERT INTO import_job_rows(job_id, row_number, payload)
        VALUES ($1,$2,$3)
        `,
        [jobId, i + 1, JSON.stringify(rows[i])],
      );
    }

    await client.query('COMMIT');

    return json(202, {
      success: true,
      jobId,
      status: 'processing',
      imported: 0,
      updated: 0,
      failed: 0,
    });
  } catch (e) {
    await client.query('ROLLBACK').catch(() => {});
    return json(500, { error: e.message });
  } finally {
    client.release();
  }
};
