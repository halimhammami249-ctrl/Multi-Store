-- Adds a sub-admin permission system on top of the existing SUPER_ADMIN /
-- ADMIN roles: SUPER_ADMIN is unchanged (full access to everything,
-- including managing other admin accounts). ADMIN is replaced by three
-- narrower roles scoped to specific stores: MANAGER (full control within
-- their assigned stores), EDITOR (create/edit, no delete), and VIEWER
-- (read-only). Existing ADMIN rows map to MANAGER, the closest equivalent
-- under the old all-or-nothing model.

ALTER TABLE admin_users DROP CONSTRAINT IF EXISTS admin_users_role_check;
ALTER TABLE admin_users ADD CONSTRAINT admin_users_role_check
  CHECK (role IN ('SUPER_ADMIN', 'MANAGER', 'EDITOR', 'VIEWER', 'ADMIN'));

UPDATE admin_users SET role = 'MANAGER' WHERE role = 'ADMIN';

ALTER TABLE admin_users DROP CONSTRAINT IF EXISTS admin_users_role_check;
ALTER TABLE admin_users ADD CONSTRAINT admin_users_role_check
  CHECK (role IN ('SUPER_ADMIN', 'MANAGER', 'EDITOR', 'VIEWER'));

-- Which stores a non-SUPER_ADMIN admin is allowed to touch. SUPER_ADMIN
-- rows never need entries here - they bypass store scoping entirely.
CREATE TABLE IF NOT EXISTS admin_user_stores (
  admin_user_id UUID NOT NULL REFERENCES admin_users(id) ON DELETE CASCADE,
  store_id UUID NOT NULL REFERENCES stores(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (admin_user_id, store_id)
);

CREATE INDEX IF NOT EXISTS idx_admin_user_stores_admin ON admin_user_stores(admin_user_id);
CREATE INDEX IF NOT EXISTS idx_admin_user_stores_store ON admin_user_stores(store_id);

-- Password reset tokens. Table works regardless of delivery mechanism -
-- email now, or a link the super admin copies/shares manually later.
CREATE TABLE IF NOT EXISTS password_reset_tokens (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  admin_user_id UUID NOT NULL REFERENCES admin_users(id) ON DELETE CASCADE,
  token_hash TEXT NOT NULL UNIQUE,
  expires_at TIMESTAMPTZ NOT NULL,
  used_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_password_reset_tokens_admin ON password_reset_tokens(admin_user_id);