const bcrypt = require('bcrypt');
const pool = require('../db');

async function main() {
  const email = (process.env.ADMIN_EMAIL || 'admin@example.com').toLowerCase();
  const password = process.env.ADMIN_PASSWORD || 'Admin123!';
  const fullName = process.env.ADMIN_FULL_NAME || 'Super Admin';
  const passwordHash = await bcrypt.hash(password, 12);

  await pool.query(
    `
    INSERT INTO admin_users (email, password_hash, full_name, role, is_active)
    VALUES ($1, $2, $3, 'SUPER_ADMIN', TRUE)
    ON CONFLICT (email)
    DO UPDATE SET
      password_hash = EXCLUDED.password_hash,
      full_name = EXCLUDED.full_name,
      role = 'SUPER_ADMIN',
      is_active = TRUE,
      updated_at = NOW();
    `,
    [email, passwordHash, fullName],
  );

  console.log(`Seeded SUPER_ADMIN: ${email}`);
}

main()
  .catch((err) => {
    console.error(err);
    process.exitCode = 1;
  })
  .finally(() => pool.end());
