import { NextRequest, NextResponse } from 'next/server';

const COOKIE_NAME = 'admin_token';

const adminPages = [
  '/',
  '/stores',
  '/products',
  '/inventory',
  '/brands',
  '/categories',
  '/attributes',
  '/media',
  '/dashboard',
];

const protectedApiPrefixes = [
  '/api/attribute-values',
  '/api/attributes',
  '/api/brands',
  '/api/categories',
  '/api/import-products',
  '/api/inventory',
  '/api/media',
  '/api/products',
  '/api/stats',
  '/api/stores',
  '/api/variant-attributes',
  '/api/variants',
  '/api/admin',
];

function isAdminPage(pathname: string) {
  return adminPages.some(
    (path) => pathname === path || pathname.startsWith(`${path}/`),
  );
}

function isProtectedApi(pathname: string) {
  if (pathname.startsWith('/api/auth') || pathname.startsWith('/api/public')) {
    return false;
  }

  return protectedApiPrefixes.some(
    (path) => pathname === path || pathname.startsWith(`${path}/`),
  );
}

function base64UrlDecode(str: string) {
  const base64 = str.replace(/-/g, '+').replace(/_/g, '/');
  const padded = base64.padEnd(Math.ceil(base64.length / 4) * 4, '=');
  const binary = atob(padded);
  const bytes = new Uint8Array(binary.length);

  for (let index = 0; index < binary.length; index += 1) {
    bytes[index] = binary.charCodeAt(index);
  }

  return JSON.parse(new TextDecoder().decode(bytes));
}

function verifyJwt(token?: string) {
  if (!token) return false;

  try {
    const parts = token.split('.');
    if (parts.length !== 3) return false;

    const payload = base64UrlDecode(parts[1]);

    const now = Math.floor(Date.now() / 1000);

    return payload?.sub && payload?.exp && payload.exp > now;
  } catch {
    return false;
  }
}

function getTokenFromCookie(cookieHeader: string | null): string | undefined {
  if (!cookieHeader) return undefined;

  const match = cookieHeader
    .split(';')
    .map((c) => c.trim())
    .find((c) => c.startsWith(`${COOKIE_NAME}=`));

  return match ? decodeURIComponent(match.split('=').slice(1).join('=')) : undefined;
}

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  const isProtected = isAdminPage(pathname) || isProtectedApi(pathname);

  if (!isProtected) {
    return NextResponse.next();
  }

  const cookieHeader = request.headers.get('cookie');
  const token = getTokenFromCookie(cookieHeader);

  const isAuthenticated = verifyJwt(token);

  if (!isAuthenticated) {
    if (pathname.startsWith('/api/')) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    }

    const loginUrl = request.nextUrl.clone();
    loginUrl.pathname = '/login';
    loginUrl.searchParams.set('next', pathname);

    return NextResponse.redirect(loginUrl);
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico).*)'],
};
