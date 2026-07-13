import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  const storeId = request.nextUrl.searchParams.get('storeId');

  if (!storeId) {
    return NextResponse.json({ error: 'storeId is required' }, { status: 400 });
  }

  try {
    const response = await fetch(
      `${process.env.URL || new URL(request.url).origin}/.netlify/functions/brands?store_id=${storeId}`,
      {
        headers: { Cookie: request.headers.get('cookie') || '' },
        cache: 'no-store',
      },
    );

    const data = await response.json();

    return NextResponse.json(data);
  } catch (err) {
    console.error(err);

    return NextResponse.json(
      {
        error: 'Unable to fetch brands',
      },
      {
        status: 500,
      },
    );
  }
}

export async function POST(request: NextRequest) {
  const storeId = request.nextUrl.searchParams.get('storeId');

  if (!storeId) {
    return NextResponse.json({ error: 'storeId is required' }, { status: 400 });
  }

  const body = await request.json();

  try {
    const response = await fetch(
      `${process.env.URL || new URL(request.url).origin}/.netlify/functions/brands?store_id=${storeId}`,
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

    return NextResponse.json(data);
  } catch (err) {
    console.error(err);

    return NextResponse.json(
      {
        error: 'Unable to create brand',
      },
      {
        status: 500,
      },
    );
  }
}

export async function PUT(request: NextRequest) {
  const storeId = request.nextUrl.searchParams.get('storeId');

  if (!storeId) {
    return NextResponse.json({ error: 'storeId is required' }, { status: 400 });
  }

  const body = await request.json();

  try {
    const response = await fetch(
      `${process.env.URL || new URL(request.url).origin}/.netlify/functions/brands?store_id=${storeId}`,
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
  } catch (err) {
    console.error(err);

    return NextResponse.json(
      {
        error: 'Unable to update brand',
      },
      {
        status: 500,
      },
    );
  }
}

export async function DELETE(request: NextRequest) {
  const storeId = request.nextUrl.searchParams.get('storeId');

  if (!storeId) {
    return NextResponse.json({ error: 'storeId is required' }, { status: 400 });
  }

  const body = await request.json();

  try {
    const response = await fetch(
      `${process.env.URL || new URL(request.url).origin}/.netlify/functions/brands?store_id=${storeId}`,
      {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
          Cookie: request.headers.get('cookie') || '',
        },
        body: JSON.stringify(body),
      },
    );

    const data = await response.json();

    return NextResponse.json(data, { status: response.status });
  } catch (err) {
    console.error(err);

    return NextResponse.json(
      {
        error: 'Unable to delete brand',
      },
      {
        status: 500,
      },
    );
  }
}
