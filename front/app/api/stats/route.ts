import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  const storeId = request.nextUrl.searchParams.get('storeId');
  const base =
    process.env.URL || process.env.URL || new URL(request.url).origin;
  const url = storeId
    ? `${base}/.netlify/functions/dashboard?storeId=${storeId}`
    : `${base}/.netlify/functions/dashboard`;
  const response = await fetch(url, {
    headers: { Cookie: request.headers.get('cookie') || '' },
    cache: 'no-store',
  });
  const data = await response.json();
  return NextResponse.json(data);
}
