import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const search = searchParams.get('search');
  const storeId = searchParams.get('storeId');
  const page = parseInt(searchParams.get('page') || '1');
  const limit = parseInt(searchParams.get('limit') || '10');

  if (!storeId) {
    return NextResponse.json({ error: 'storeId is required' }, { status: 400 });
  }

  try {
    const response = await fetch(
      `${process.env.URL || new URL(request.url).origin}/.netlify/functions/products?store_id=${storeId}`,
      {
        headers: { Cookie: request.headers.get('cookie') || '' },
        cache: 'no-store',
      },
    );
    const data = await response.json();
    let filtered = Array.isArray(data) ? data : data.data || [];

    if (search) {
      const query = search.toLowerCase();
      filtered = filtered.filter(
        (p: any) =>
          p.name.toLowerCase().includes(query) ||
          p.brand.toLowerCase().includes(query),
      );
    }

    const total = filtered.length;
    const start = (page - 1) * limit;
    const end = start + limit;
    const items = filtered.slice(start, end);

    return NextResponse.json({
      data: items,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    console.error(error);

    return NextResponse.json(
      { error: 'Unable to fetch products' },
      { status: 500 },
    );
  }
}

export async function POST(request: NextRequest) {
  const storeId = request.nextUrl.searchParams.get('storeId');

  if (!storeId) {
    return NextResponse.json({ error: 'storeId is required' }, { status: 400 });
  }

  try {
    const body = await request.json();
    const response = await fetch(
      `${process.env.URL || new URL(request.url).origin}/.netlify/functions/products?store_id=${storeId}`,
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
  } catch (error) {
    console.error(error);

    return NextResponse.json(
      { error: 'Failed to create product' },
      { status: 400 },
    );
  }
}

export async function PUT(request: NextRequest) {
  const storeId = request.nextUrl.searchParams.get('storeId');
  const productId = request.nextUrl.searchParams.get('id');

  if (!storeId || !productId) {
    return NextResponse.json(
      { error: 'storeId and id are required' },
      { status: 400 },
    );
  }

  try {
    const body = await request.json();
    const response = await fetch(
      `${process.env.URL || new URL(request.url).origin}/.netlify/functions/product?store_id=${storeId}&id=${productId}`,
      {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Cookie: request.headers.get('cookie') || '',
        },
        body: JSON.stringify(body),
      },
    );
    const data = await response.json();

    return NextResponse.json(data, { status: response.status });
  } catch (error) {
    console.error(error);

    return NextResponse.json(
      { error: 'Failed to update product' },
      { status: 400 },
    );
  }
}

export async function DELETE(request: NextRequest) {
  const storeId = request.nextUrl.searchParams.get('storeId');
  const productId = request.nextUrl.searchParams.get('id');

  if (!storeId || !productId) {
    return NextResponse.json(
      { error: 'storeId and id are required' },
      { status: 400 },
    );
  }

  try {
    const response = await fetch(
      `${process.env.URL || new URL(request.url).origin}/.netlify/functions/product?store_id=${storeId}&id=${productId}`,
      {
        method: 'DELETE',
        headers: { Cookie: request.headers.get('cookie') || '' },
      },
    );

    if (response.status === 204) {
      return NextResponse.json({ success: true });
    }

    const data = await response.json();

    return NextResponse.json(data, { status: response.status });
  } catch (error) {
    console.error(error);

    return NextResponse.json(
      { error: 'Failed to delete product' },
      { status: 400 },
    );
  }
}
