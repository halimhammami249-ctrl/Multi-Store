const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const pool = require('../db');

const COOKIE_NAME = 'admin_token';
const TOKEN_MAX_AGE_SECONDS = 60 * 60 * 24 * 7;

function jwtSecret() {
  return process.env.JWT_SECRET || 'dev-secret-change-me';
}

function publicUser(user) {
  return {
    id: user.id,
    email: user.email,
    full_name: user.full_name,
    role: user.role,
  };
}

function encodeCookieValue(value) {
  return encodeURIComponent(String(value));
}

function serializeCookie(name, value, options = {}) {
  const parts = [`${name}=${encodeCookieValue(value)}`];

  if (options.maxAge !== undefined) parts.push(`Max-Age=${options.maxAge}`);
  if (options.path) parts.push(`Path=${options.path}`);
  if (options.httpOnly) parts.push('HttpOnly');
  if (options.secure) parts.push('Secure');
  if (options.sameSite) parts.push(`SameSite=${options.sameSite}`);

  return parts.join('; ');
}

function parseCookies(cookieHeader = '') {
  return String(cookieHeader || '')
    .split(';')
    .map((part) => part.trim())
    .filter(Boolean)
    .reduce((cookies, part) => {
      const separatorIndex = part.indexOf('=');
      if (separatorIndex === -1) return cookies;

      const key = part.slice(0, separatorIndex).trim();
      const value = part.slice(separatorIndex + 1);

      try {
        cookies[key] = decodeURIComponent(value);
      } catch (_err) {
        cookies[key] = value;
      }

      return cookies;
    }, {});
}

function createAuthCookie(token, remember = false) {
  return serializeCookie(COOKIE_NAME, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'Lax',
    path: '/',
    maxAge: remember ? TOKEN_MAX_AGE_SECONDS * 4 : TOKEN_MAX_AGE_SECONDS,
  });
}

function clearAuthCookie() {
  return serializeCookie(COOKIE_NAME, '', {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'Lax',
    path: '/',
    maxAge: 0,
  });
}

function readTokenFromCookie(cookieHeader = '') {
  return parseCookies(cookieHeader)[COOKIE_NAME];
}

async function login(email, password, remember = false) {
  const normalizedEmail = String(email || '')
    .trim()
    .toLowerCase();

  if (!normalizedEmail || !password) {
    const err = new Error('Email and password are required');
    err.statusCode = 400;
    throw err;
  }

  const result = await pool.query(
    `
    SELECT id, email, password_hash, full_name, role, is_active
    FROM admin_users
    WHERE LOWER(email) = LOWER($1)
    LIMIT 1;
    `,
    [normalizedEmail],
  );
  const user = result.rows[0];

  if (!user || !user.is_active) {
    const err = new Error('Invalid email or password');
    err.statusCode = 401;
    throw err;
  }

  const passwordOk = await bcrypt.compare(password, user.password_hash);

  if (!passwordOk) {
    const err = new Error('Invalid email or password');
    err.statusCode = 401;
    throw err;
  }

  await pool.query('UPDATE admin_users SET last_login = NOW() WHERE id = $1;', [
    user.id,
  ]);

  const token = jwt.sign(
    { sub: user.id, email: user.email, role: user.role },
    jwtSecret(),
    { expiresIn: remember ? '28d' : '7d' },
  );

  return {
    user: publicUser(user),
    cookie: createAuthCookie(token, remember),
  };
}

async function verifyToken(token) {
  if (!token) return null;

  try {
    const payload = jwt.verify(token, jwtSecret());
    const result = await pool.query(
      `
      SELECT id, email, full_name, role, is_active
      FROM admin_users
      WHERE id = $1
      LIMIT 1;
      `,
      [payload.sub],
    );
    const user = result.rows[0];

    if (!user || !user.is_active) return null;

    return publicUser(user);
  } catch (_err) {
    return null;
  }
}

async function currentUser(cookieHeader) {
  return verifyToken(readTokenFromCookie(cookieHeader));
}

module.exports = {
  COOKIE_NAME,
  clearAuthCookie,
  currentUser,
  login,
  readTokenFromCookie,
  verifyToken,
};
