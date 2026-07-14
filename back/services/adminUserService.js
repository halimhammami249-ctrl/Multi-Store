const bcrypt = require('bcryptjs');
const pool = require('../db');

const VALID_ROLES = ['SUPER_ADMIN', 'MANAGER', 'EDITOR', 'VIEWER'];

function httpError(statusCode, message) {
  const err = new Error(message);
  err.statusCode = statusCode;
  return err;
}

function validateRole(role) {
  if (!VALID_ROLES.includes(role)) {
    throw httpError(400, `role must be one of: ${VALID_ROLES.join(', ')}`);
  }
}

async function listAdminUsers() {
  const result = await pool.query(`
    SELECT
      u.id,
      u.email,
      u.full_name,
      u.role,
      u.is_active,
      u.last_login,
      u.created_at,
      COALESCE(
        JSON_AGG(
          JSON_BUILD_OBJECT('id', s.id, 'name', s.name)
          ORDER BY s.name
        ) FILTER (WHERE s.id IS NOT NULL),
        '[]'
      ) AS stores
    FROM admin_users u
    LEFT JOIN admin_user_stores aus ON aus.admin_user_id = u.id
    LEFT JOIN stores s ON s.id = aus.store_id
    GROUP BY u.id
    ORDER BY u.created_at DESC;
  `);

  return result.rows;
}

async function setAdminUserStores(client, adminUserId, storeIds) {
  await client.query(
    'DELETE FROM admin_user_stores WHERE admin_user_id = $1;',
    [adminUserId],
  );

  if (!storeIds || storeIds.length === 0) return;

  const values = storeIds.map((_, i) => `($1, $${i + 2})`).join(', ');
  await client.query(
    `INSERT INTO admin_user_stores (admin_user_id, store_id) VALUES ${values} ON CONFLICT DO NOTHING;`,
    [adminUserId, ...storeIds],
  );
}

async function createAdminUser({ email, password, fullName, role, storeIds }) {
  const normalizedEmail = String(email || '')
    .trim()
    .toLowerCase();

  if (!normalizedEmail || !password || !fullName) {
    throw httpError(400, 'email, password, and fullName are required');
  }
  validateRole(role);

  if (role !== 'SUPER_ADMIN' && (!storeIds || storeIds.length === 0)) {
    throw httpError(400, 'At least one store must be assigned for this role');
  }

  const passwordHash = await bcrypt.hash(password, 12);
  const client = await pool.connect();

  try {
    await client.query('BEGIN');

    const result = await client.query(
      `
      INSERT INTO admin_users (email, password_hash, full_name, role, is_active)
      VALUES ($1, $2, $3, $4, TRUE)
      RETURNING id, email, full_name, role, is_active, created_at;
      `,
      [normalizedEmail, passwordHash, fullName, role],
    );
    const user = result.rows[0];

    if (role !== 'SUPER_ADMIN') {
      await setAdminUserStores(client, user.id, storeIds);
    }

    await client.query('COMMIT');
    return user;
  } catch (err) {
    await client.query('ROLLBACK');
    if (err.code === '23505') {
      throw httpError(409, 'An account with this email already exists');
    }
    throw err;
  } finally {
    client.release();
  }
}

async function updateAdminUser(id, { fullName, role, isActive, storeIds }) {
  if (role) validateRole(role);

  const client = await pool.connect();

  try {
    await client.query('BEGIN');

    const result = await client.query(
      `
      UPDATE admin_users
      SET
        full_name = COALESCE($2, full_name),
        role = COALESCE($3, role),
        is_active = COALESCE($4, is_active),
        updated_at = NOW()
      WHERE id = $1
      RETURNING id, email, full_name, role, is_active, created_at;
      `,
      [id, fullName ?? null, role ?? null, isActive ?? null],
    );
    const user = result.rows[0];

    if (!user) {
      await client.query('ROLLBACK');
      return null;
    }

    if (storeIds !== undefined && user.role !== 'SUPER_ADMIN') {
      await setAdminUserStores(client, id, storeIds);
    } else if (user.role === 'SUPER_ADMIN') {
      // A super admin doesn't need per-store rows - keep the table clean.
      await client.query(
        'DELETE FROM admin_user_stores WHERE admin_user_id = $1;',
        [id],
      );
    }

    await client.query('COMMIT');
    return user;
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
}

async function resetAdminPassword(id, newPassword) {
  if (!newPassword || newPassword.length < 8) {
    throw httpError(400, 'Password must be at least 8 characters');
  }

  const passwordHash = await bcrypt.hash(newPassword, 12);
  const result = await pool.query(
    `UPDATE admin_users SET password_hash = $2, updated_at = NOW() WHERE id = $1 RETURNING id, email;`,
    [id, passwordHash],
  );

  return result.rows[0];
}

async function deleteAdminUser(id, requestingUserId) {
  if (id === requestingUserId) {
    throw httpError(400, "You can't delete your own account");
  }

  const target = await pool.query(
    'SELECT role FROM admin_users WHERE id = $1;',
    [id],
  );
  if (!target.rows[0]) return null;

  if (target.rows[0].role === 'SUPER_ADMIN') {
    const remaining = await pool.query(
      `SELECT COUNT(*) FROM admin_users WHERE role = 'SUPER_ADMIN' AND is_active = TRUE AND id != $1;`,
      [id],
    );
    if (Number(remaining.rows[0].count) === 0) {
      throw httpError(400, 'Cannot delete the last remaining super admin');
    }
  }

  const result = await pool.query(
    'DELETE FROM admin_users WHERE id = $1 RETURNING id, email;',
    [id],
  );

  return result.rows[0];
}

module.exports = {
  VALID_ROLES,
  createAdminUser,
  deleteAdminUser,
  listAdminUsers,
  resetAdminPassword,
  updateAdminUser,
};
