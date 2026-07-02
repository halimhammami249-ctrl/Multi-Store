const pool = require('../db');

async function main() {
  const brand = await pool.query(
    `
    INSERT INTO brands (id, store_id, name, slug, is_active)
    VALUES ($1, $2, $3, $4, true)
    ON CONFLICT (store_id, slug) DO UPDATE
    SET name = EXCLUDED.name,
        is_active = EXCLUDED.is_active
    RETURNING id;
    `,
    [
      '22222222-2222-2222-2222-222222222221',
      '11111111-1111-1111-1111-111111111111',
      'Nike',
      'nike',
    ],
  );

  await pool.query(
    `
    UPDATE products
    SET brand_id = $1
    WHERE id = $2;
    `,
    [brand.rows[0].id, '44444444-4444-4444-4444-444444444441'],
  );

  console.log('sample brand fixed');
}

main()
  .catch((err) => {
    console.error(err);
    process.exitCode = 1;
  })
  .finally(() => pool.end());
