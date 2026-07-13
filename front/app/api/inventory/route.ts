import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const storeId = searchParams.get('storeId');

  if (!storeId) {
    return NextResponse.json({ error: 'storeId is required' }, { status: 400 });
  }

  try {
    const response = await fetch(
      `${process.env.URL || new URL(request.url).origin}/.netlify/functions/inventory?store_id=${storeId}`,
      {
        headers: { Cookie: request.headers.get('cookie') || '' },
        cache: 'no-store',
      },
    );
    const data = await response.json();

    return NextResponse.json(data, { status: response.status });
  } catch (error) {
    console.error(error);

    return NextResponse.json(
      { error: 'Unable to fetch inventory' },
      { status: 500 },
    );
  }
}

export async function PUT(request: NextRequest) {
  try {
    const body = await request.json();
    const { storeId, variantId, stock } = body;

    if (!storeId) {
      return NextResponse.json(
        { error: 'storeId is required' },
        { status: 400 },
      );
    }

    const response = await fetch(
      `${process.env.URL || new URL(request.url).origin}/.netlify/functions/inventory?store_id=${storeId}`,
      {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Cookie: request.headers.get('cookie') || '',
        },
        body: JSON.stringify({ variantId, stock }),
      },
    );
    const data = await response.json();

    return NextResponse.json(data, { status: response.status });
  } catch (error) {
    console.error(error);

    return NextResponse.json(
      { error: 'Failed to update inventory' },
      { status: 400 },
    );
  }
}
