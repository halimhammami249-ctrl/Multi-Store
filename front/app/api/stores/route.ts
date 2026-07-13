import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  try {
    const response = await fetch(
      `${process.env.URL || new URL(request.url).origin}/.netlify/functions/stores`,
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
        success: false,
        error: 'Unable to load stores',
      },
      {
        status: 500,
      },
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const response = await fetch(
      `${process.env.URL || new URL(request.url).origin}/.netlify/functions/stores`,
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
  } catch (err) {
    console.error(err);

    return NextResponse.json(
      {
        success: false,
        error: 'Unable to create store',
      },
      {
        status: 500,
      },
    );
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const body = await request.json();
    const response = await fetch(
      `${process.env.URL || new URL(request.url).origin}/.netlify/functions/stores`,
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
        success: false,
        error: 'Unable to delete store',
      },
      {
        status: 500,
      },
    );
  }
}
