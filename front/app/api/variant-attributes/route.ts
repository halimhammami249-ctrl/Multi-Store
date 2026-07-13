import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  const storeId = request.nextUrl.searchParams.get('storeId');
  const variantId = request.nextUrl.searchParams.get('variantId');

  if (!storeId || !variantId) {
    return NextResponse.json(
      { error: 'storeId and variantId are required' },
      { status: 400 },
    );
  }

  const body = await request.json();
  const response = await fetch(
    `${process.env.URL || new URL(request.url).origin}/.netlify/functions/variant-attributes?store_id=${storeId}&variant_id=${variantId}`,
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Cookie: request.headers.get('cookie') || '',
      },
      body: JSON.stringify(body),
    },
  );
  const data = await response.json();

  return NextResponse.json(data, { status: response.status });
}
