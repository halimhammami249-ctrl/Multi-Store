const pool = require('../../db');
const cloudinary = require('cloudinary').v2;

const CHUNK_SIZE = 20;

function json(statusCode, body) {
  return {
    statusCode,
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  };
}

/* ---------------- CLOUDINARY ---------------- */

function configureCloudinary() {
  cloudinary.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET,
  });
}

// SCALABILITY FIX: this used to be `cloudinary.uploader.upload(url, ...)`
// - which downloads the image bytes back down from Cloudinary and
// re-uploads them, per row, just to move it into a per-product folder.
// For 1,000 images that's 1,000 full download+upload round trips on top
// of the original upload from the browser - it roughly doubles the
// total image transfer time and is the single biggest throughput killer
// in the whole pipeline.
//
// `rename` is a metadata operation - Cloudinary just points the existing
// asset at a new public_id/folder, no file data moves at all. This only
// works when the browser upload gave us a publicId (see
// image-drop-zone.tsx); if for some reason it didn't, we fall back to
// just using the existing URL unchanged rather than re-uploading.
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
    // If the rename fails (e.g. target already taken by a prior run and
    // overwrite raced), don't fail the whole row over a cosmetic folder
    // move - just keep the image where the browser already put it.
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

/* ---------------- FIX: BRAND/CATEGORY ----------------
 * The original code did `SELECT id FROM brands WHERE store_id=$1 LIMIT 1`
 * (and the same for categories) - completely ignoring row.brand /
 * row.category from the spreadsheet, so every product in every import
 * silently got assigned to whichever brand/category happened to exist
 * first for that store. This now looks up (or creates) the brand/category
 * that actually matches the row's data.
 */
async function getOrCreateBrand(client, storeId, name) {
  const brandName =
    name && String(name).trim() ? String(name).trim() : 'Default Brand';

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

async function getOrCreateCategory(client, storeId, name) {
  const categoryName =
    name && String(name).trim() ? String(name).trim() : 'Default Category';
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
    /* ---------------- JOB ---------------- */
    const job = await getJobSnapshot(client, jobId);
    if (!job) return json(404, { error: 'Job not found' });

    const storeId = job.store_id;

    /* ---------------- ROWS ---------------- */
    const rowsRes = await client.query(
      `
      SELECT *
      FROM import_job_rows
      WHERE job_id=$1 AND status='pending'
      ORDER BY row_number
      LIMIT $2
      `,
      [jobId, CHUNK_SIZE],
    );

    const rows = rowsRes.rows;

    // FIX: previously this branch never updated import_jobs.status, so
    // the job stayed 'processing' forever in the DB, and the response
    // omitted imported/updated/failed/totalRows entirely - the frontend
    // rendered "undefined imported / undefined updated / undefined failed".
    if (rows.length === 0) {
      await client.query(
        `UPDATE import_jobs SET status='completed' WHERE id=$1 AND status != 'completed'`,
        [jobId],
      );

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

    await client.query('BEGIN');

    for (const r of rows) {
      const row =
        typeof r.payload === 'string' ? JSON.parse(r.payload) : r.payload;

      // FIX: without a SAVEPOINT, a single failing query anywhere below
      // (e.g. an ON CONFLICT clause referencing a constraint that doesn't
      // exist yet) marks the ENTIRE transaction as aborted at the Postgres
      // level. Every query after that point - for every remaining row in
      // this chunk, including the catch block below trying to mark just
      // THIS row as failed - then throws "current transaction is aborted,
      // commands ignored until end of transaction block", which escapes
      // this try/catch entirely and turns into a 500 for the whole chunk.
      // A SAVEPOINT lets us roll back just this row's work on failure and
      // keep processing the rest of the chunk normally.
      await client.query('SAVEPOINT row_sp');

      try {
        await client.query(
          `UPDATE import_job_rows SET status='processing' WHERE id=$1`,
          [r.id],
        );

        if (!row.name) throw new Error('Missing product name');

        const slug = slugify(row.name);

        const brandId = await getOrCreateBrand(client, storeId, row.brand);
        const categoryId = await getOrCreateCategory(
          client,
          storeId,
          row.category,
        );

        /* ---------------- PRODUCT (UPSERT SAFE) ---------------- */
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

        // FIX: variant existed check before insert so we can tell whether
        // this row is a new product/variant or an update to an existing
        // one - the old code always incremented "imported" even when it
        // was really updating a variant that already existed, and the
        // plain INSERT with no ON CONFLICT meant re-running the same
        // import file would throw a duplicate-key error (or create dupes
        // if there was no unique constraint at all).
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

        /* ---------------- IMAGE ---------------- */
        let imageUrl = null;

        if (row.imageUrl) {
          imageUrl = await relocateImage(
            row.imagePublicId,
            row.imageUrl,
            storeId,
            slug,
          );
        }

        if (imageUrl) {
          await client.query(
            `
            INSERT INTO product_images(variant_id, url, position)
            VALUES ($1,$2,0)
            ON CONFLICT (variant_id, position)
            DO UPDATE SET url = EXCLUDED.url
            `,
            [variantId, imageUrl],
          );
        }

        /* ---------------- MARK DONE ---------------- */
        await client.query(
          `UPDATE import_job_rows SET status='completed' WHERE id=$1`,
          [r.id],
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
        // Roll back only this row's work - the transaction as a whole is
        // still healthy after this, so subsequent rows and the final
        // COMMIT aren't affected.
        await client.query('ROLLBACK TO SAVEPOINT row_sp');

        await client.query(
          `
          UPDATE import_job_rows
          SET status='failed', error=$2
          WHERE id=$1
          `,
          [r.id, err.message],
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
