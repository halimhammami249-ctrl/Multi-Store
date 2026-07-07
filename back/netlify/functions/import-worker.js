const pool = require('../../db');
const cloudinary = require('cloudinary').v2;

// SCALE: bumped from 20 now that brand/category lookups are batched and
// image relocation is parallelized - each row does far less serial work,
// so a bigger chunk still finishes comfortably inside the function's
// execution window. Override via env if a particular deployment target
// needs a smaller window.
const CHUNK_SIZE = Number(process.env.IMPORT_CHUNK_SIZE || 50);

// How many Cloudinary rename calls to run at once per chunk. Cloudinary
// rate limits are per-account, not per-request, so this is deliberately
// conservative rather than "as many as CHUNK_SIZE".
const IMAGE_CONCURRENCY = Number(process.env.IMPORT_IMAGE_CONCURRENCY || 8);

function json(statusCode, body) {
  return {
    statusCode,
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  };
}

/* ---------------- SMALL CONCURRENCY LIMITER ----------------
 * No extra dependency - just caps how many of `items` are in flight via
 * `fn` at once, instead of either fully sequential (slow) or a single
 * unbounded Promise.all (risks hammering Cloudinary/DB with 50+ requests
 * at once in the same tick).
 */
async function mapWithConcurrency(items, concurrency, fn) {
  const results = new Array(items.length);
  let next = 0;

  async function worker() {
    while (true) {
      const i = next++;
      if (i >= items.length) return;
      results[i] = await fn(items[i], i);
    }
  }

  await Promise.all(
    Array.from({ length: Math.min(concurrency, items.length) }, worker),
  );

  return results;
}

/* ---------------- CLOUDINARY ---------------- */

let cloudinaryConfigured = false;
function configureCloudinary() {
  if (cloudinaryConfigured) return;
  cloudinary.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET,
  });
  cloudinaryConfigured = true;
}

// SCALABILITY FIX (kept from before): `rename` is a metadata operation, no
// file bytes move. Only works when the browser upload gave us a publicId;
// otherwise we fall back to the existing URL unchanged.
async function relocateImage(publicId, url, storeId, slug) {
  if (!publicId) return url || null;

  configureCloudinary();

  const targetPublicId = `stores/${storeId}/products/${slug}`;

  try {
    const res = await cloudinary.uploader.rename(publicId, targetPublicId, {
      overwrite: true,
    });
    return res.secure_url;
  } catch (err) {
    return url || null;
  }
}

function slugify(v) {
  return String(v || '')
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '');
}

/* ---------------- BRAND / CATEGORY BULK RESOLUTION ----------------
 * SCALE: the old code did one SELECT (+ maybe one INSERT) per row, per
 * table - for 500 rows sharing 5 brands that's up to 1,000 avoidable
 * round trips. This resolves every distinct brand/category name in the
 * whole chunk in a single upsert statement each, using the case-insensitive
 * unique indexes added in import-scale-migration.sql as the ON CONFLICT
 * target (mirrors the LOWER(name)=LOWER($2) matching the old per-row code
 * used). `DO UPDATE SET name = <table>.name` is a no-op write that exists
 * purely so Postgres returns the row on the conflict path too - RETURNING
 * doesn't fire for skipped rows under DO NOTHING.
 */
function displayNameOrDefault(name, fallback) {
  return name && String(name).trim() ? String(name).trim() : fallback;
}

async function resolveBrandsBulk(client, storeId, rawNames) {
  const byLower = new Map();
  for (const n of rawNames) {
    const display = displayNameOrDefault(n, 'Default Brand');
    const key = display.toLowerCase();
    if (!byLower.has(key)) byLower.set(key, display);
  }

  const map = new Map();
  const names = [...byLower.values()];
  if (!names.length) return map;

  const res = await client.query(
    `
    INSERT INTO brands (name, store_id)
    SELECT name, $2::uuid FROM unnest($1::text[]) AS name
    ON CONFLICT (store_id, LOWER(name)) DO UPDATE SET name = brands.name
    RETURNING id, LOWER(name) AS key
    `,
    [names, storeId],
  );

  for (const row of res.rows) map.set(row.key, row.id);
  return map;
}

async function resolveCategoriesBulk(client, storeId, rawNames) {
  const byLower = new Map();
  for (const n of rawNames) {
    const display = displayNameOrDefault(n, 'Default Category');
    const key = display.toLowerCase();
    if (!byLower.has(key)) byLower.set(key, display);
  }

  const map = new Map();
  const names = [...byLower.values()];
  if (!names.length) return map;

  const slugs = names.map((n) => slugify(n) || 'default-category');

  const res = await client.query(
    `
    INSERT INTO categories (name, store_id, slug)
    SELECT t.name, $3::uuid, t.slug
    FROM unnest($1::text[], $2::text[]) AS t(name, slug)
    ON CONFLICT (store_id, LOWER(name)) DO UPDATE SET name = categories.name
    RETURNING id, LOWER(name) AS key
    `,
    [names, slugs, storeId],
  );

  for (const row of res.rows) map.set(row.key, row.id);
  return map;
}

// Fallback path (identical to the old per-row logic) used only if the bulk
// resolve statement above throws - e.g. a rare cross-constraint slug clash.
// Keeps the chunk resilient without making the common case pay for it.
async function getOrCreateBrandRow(client, storeId, name) {
  const brandName = displayNameOrDefault(name, 'Default Brand');
  const existing = await client.query(
    `SELECT id FROM brands WHERE store_id=$1 AND LOWER(name)=LOWER($2)`,
    [storeId, brandName],
  );
  if (existing.rows[0]) return existing.rows[0].id;
  const created = await client.query(
    `INSERT INTO brands(name, store_id) VALUES ($1,$2) RETURNING id`,
    [brandName, storeId],
  );
  return created.rows[0].id;
}

async function getOrCreateCategoryRow(client, storeId, name) {
  const categoryName = displayNameOrDefault(name, 'Default Category');
  const categorySlug = slugify(categoryName) || 'default-category';
  const existing = await client.query(
    `SELECT id FROM categories WHERE store_id=$1 AND LOWER(name)=LOWER($2)`,
    [storeId, categoryName],
  );
  if (existing.rows[0]) return existing.rows[0].id;
  const created = await client.query(
    `INSERT INTO categories(name, store_id, slug) VALUES ($1,$2,$3) RETURNING id`,
    [categoryName, storeId, categorySlug],
  );
  return created.rows[0].id;
}

async function getJobSnapshot(client, jobId) {
  const res = await client.query(`SELECT * FROM import_jobs WHERE id=$1`, [
    jobId,
  ]);
  return res.rows[0];
}

exports.handler = async (event) => {
  if (event.httpMethod !== 'POST') {
    return json(405, { error: 'Method not allowed' });
  }

  const jobId = event.queryStringParameters?.job_id;
  if (!jobId) return json(400, { error: 'job_id required' });

  const client = await pool.connect();

  try {
    const job = await getJobSnapshot(client, jobId);
    if (!job) return json(404, { error: 'Job not found' });

    const storeId = job.store_id;

    await client.query('BEGIN');

    // SCALE + CORRECTNESS FIX: claim rows atomically with FOR UPDATE
    // SKIP LOCKED instead of a plain SELECT ... WHERE status='pending'.
    // The old query just read whatever was pending with no lock, so two
    // overlapping invocations (a retried fetch, two open tabs, or a future
    // move to concurrent workers) could both grab and process the same
    // rows. This also folds the old separate "mark row processing"
    // per-row UPDATE into the claim itself, saving another round trip
    // per row.
    const claimRes = await client.query(
      `
      WITH claimed AS (
        SELECT id
        FROM import_job_rows
        WHERE job_id=$1 AND status='pending'
        ORDER BY row_number
        LIMIT $2
        FOR UPDATE SKIP LOCKED
      )
      UPDATE import_job_rows
      SET status='processing'
      WHERE id IN (SELECT id FROM claimed)
      RETURNING *
      `,
      [jobId, CHUNK_SIZE],
    );

    const rows = claimRes.rows;

    if (rows.length === 0) {
      await client.query(
        `UPDATE import_jobs SET status='completed' WHERE id=$1 AND status != 'completed'`,
        [jobId],
      );
      await client.query('COMMIT');

      const finalJob = await getJobSnapshot(client, jobId);
      return json(200, {
        status: 'completed',
        jobId,
        imported: finalJob.imported,
        updated: finalJob.updated,
        failed: finalJob.failed,
        totalRows: finalJob.total_rows,
        processedRows: finalJob.processed_rows,
      });
    }

    const parsedRows = rows.map((r) => ({
      meta: r,
      row: typeof r.payload === 'string' ? JSON.parse(r.payload) : r.payload,
    }));

    /* ---------------- BULK BRAND/CATEGORY RESOLUTION ---------------- */
    let brandMap = new Map();
    let categoryMap = new Map();
    let bulkLookupFailed = false;

    await client.query('SAVEPOINT lookup_sp');
    try {
      brandMap = await resolveBrandsBulk(
        client,
        storeId,
        parsedRows.map((p) => p.row.brand),
      );
      categoryMap = await resolveCategoriesBulk(
        client,
        storeId,
        parsedRows.map((p) => p.row.category),
      );
      await client.query('RELEASE SAVEPOINT lookup_sp');
    } catch (err) {
      await client.query('ROLLBACK TO SAVEPOINT lookup_sp');
      bulkLookupFailed = true;
    }

    /* ---------------- PARALLEL IMAGE RELOCATION ----------------
     * SCALE: this used to run inside the per-row DB loop, so 50 rows with
     * images meant 50 sequential Cloudinary round trips blocking the
     * transaction the whole time. It's pure network I/O with no DB
     * dependency (only needs the row's own slug), so it's pulled out and
     * run with bounded concurrency before touching the DB at all.
     */
    await mapWithConcurrency(parsedRows, IMAGE_CONCURRENCY, async (p) => {
      if (!p.row.imageUrl) {
        p.resolvedImageUrl = null;
        return;
      }
      const slug = slugify(p.row.name);
      p.resolvedImageUrl = await relocateImage(
        p.row.imagePublicId,
        p.row.imageUrl,
        storeId,
        slug,
      );
    });

    /* ---------------- PER-ROW DB WRITE ----------------
     * Product/variant/image writes stay per-row (with a SAVEPOINT each)
     * rather than bulked, deliberately: real-world spreadsheets are messy,
     * and this keeps one bad row (bad price, missing name, a stray
     * constraint violation) from taking out the whole chunk while still
     * cutting out the two most expensive N+1 sources (brand/category
     * lookups, serial image uploads).
     */
    for (const p of parsedRows) {
      const { row, meta } = p;

      await client.query('SAVEPOINT row_sp');

      try {
        if (!row.name) throw new Error('Missing product name');

        const slug = slugify(row.name);

        const brandKey = displayNameOrDefault(
          row.brand,
          'Default Brand',
        ).toLowerCase();
        const categoryKey = displayNameOrDefault(
          row.category,
          'Default Category',
        ).toLowerCase();

        const brandId = bulkLookupFailed
          ? await getOrCreateBrandRow(client, storeId, row.brand)
          : brandMap.get(brandKey);
        const categoryId = bulkLookupFailed
          ? await getOrCreateCategoryRow(client, storeId, row.category)
          : categoryMap.get(categoryKey);

        if (!brandId || !categoryId) {
          throw new Error('Could not resolve brand/category for row');
        }

        const productRes = await client.query(
          `
          INSERT INTO products(name, store_id, slug, brand_id, category_id)
          VALUES ($1,$2,$3,$4,$5)
          ON CONFLICT (store_id, slug)
          DO UPDATE SET name = EXCLUDED.name,
                        brand_id = EXCLUDED.brand_id,
                        category_id = EXCLUDED.category_id
          RETURNING id
          `,
          [row.name, storeId, slug, brandId, categoryId],
        );

        const productId = productRes.rows[0].id;
        const variantSku = row.sku || slug;

        const existingVariant = await client.query(
          `SELECT id FROM product_variants WHERE product_id=$1 AND sku=$2`,
          [productId, variantSku],
        );
        const isUpdate = !!existingVariant.rows[0];

        const variantRes = await client.query(
          `
          INSERT INTO product_variants(product_id, sku, price, stock)
          VALUES ($1,$2,$3,$4)
          ON CONFLICT (product_id, sku)
          DO UPDATE SET price = EXCLUDED.price,
                        stock = EXCLUDED.stock
          RETURNING id
          `,
          [
            productId,
            variantSku,
            Number(row.price || 0),
            Number(row.stock || 0),
          ],
        );

        const variantId = variantRes.rows[0].id;

        if (p.resolvedImageUrl) {
          await client.query(
            `
            INSERT INTO product_images(variant_id, url, position)
            VALUES ($1,$2,0)
            ON CONFLICT (variant_id, position)
            DO UPDATE SET url = EXCLUDED.url
            `,
            [variantId, p.resolvedImageUrl],
          );
        }

        await client.query(
          `UPDATE import_job_rows SET status='completed' WHERE id=$1`,
          [meta.id],
        );

        await client.query(
          `
          UPDATE import_jobs
          SET imported = imported + $2,
              updated = updated + $3,
              processed_rows = processed_rows + 1
          WHERE id=$1
          `,
          [jobId, isUpdate ? 0 : 1, isUpdate ? 1 : 0],
        );

        await client.query('RELEASE SAVEPOINT row_sp');
      } catch (err) {
        await client.query('ROLLBACK TO SAVEPOINT row_sp');

        await client.query(
          `
          UPDATE import_job_rows
          SET status='failed', error=$2
          WHERE id=$1
          `,
          [meta.id, err.message],
        );

        await client.query(
          `
          UPDATE import_jobs
          SET failed = failed + 1,
              processed_rows = processed_rows + 1
          WHERE id=$1
          `,
          [jobId],
        );
      }
    }

    await client.query('COMMIT');

    const updatedJob = await getJobSnapshot(client, jobId);

    return json(200, {
      status: 'processing',
      processed: rows.length,
      jobId,
      imported: updatedJob.imported,
      updated: updatedJob.updated,
      failed: updatedJob.failed,
      totalRows: updatedJob.total_rows,
      processedRows: updatedJob.processed_rows,
    });
  } catch (err) {
    await client.query('ROLLBACK').catch(() => {});
    return json(500, { error: err.message });
  } finally {
    client.release();
  }
};
