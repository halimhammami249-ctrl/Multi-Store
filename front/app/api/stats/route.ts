import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  const storeId = request.nextUrl.searchParams.get('storeId');

  const url = storeId
    ? `${new URL(request.url).origin}/.netlify/functions/dashboard?storeId=${storeId}`
    : `${new URL(request.url).origin}/.netlify/functions/dashboard`;

  const response = await fetch(url, {
    cache: 'no-store',
  });

  const data = await response.json();

  return NextResponse.json(data);
}
