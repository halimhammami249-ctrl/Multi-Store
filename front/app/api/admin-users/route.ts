import { NextRequest, NextResponse } from 'next/server';

function functionsBase(request: NextRequest) {
  return `${process.env.URL || new URL(request.url).origin}/.netlify/functions`;
}

export async function GET(request: NextRequest) {
  try {
    const response = await fetch(`${functionsBase(request)}/admin-users`, {
      headers: { Cookie: request.headers.get('cookie') || '' },
      cache: 'no-store',
    });
    const data = await response.json();
    return NextResponse.json(data, { status: response.status });
  } catch (error) {
    console.error(error);
    return NextResponse.json(
      { error: 'Unable to load admin users' },
      { status: 500 },
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const response = await fetch(`${functionsBase(request)}/admin-users`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Cookie: request.headers.get('cookie') || '',
      },
      body: JSON.stringify(body),
    });
    const data = await response.json();
    return NextResponse.json(data, { status: response.status });
  } catch (error) {
    console.error(error);
    return NextResponse.json(
      { error: 'Unable to create admin user' },
      { status: 500 },
    );
  }
}

export async function PUT(request: NextRequest) {
  try {
    const body = await request.json();
    const response = await fetch(`${functionsBase(request)}/admin-users`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        Cookie: request.headers.get('cookie') || '',
      },
      body: JSON.stringify(body),
    });
    const data = await response.json();
    return NextResponse.json(data, { status: response.status });
  } catch (error) {
    console.error(error);
    return NextResponse.json(
      { error: 'Unable to update admin user' },
      { status: 500 },
    );
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const body = await request.json();
    const response = await fetch(`${functionsBase(request)}/admin-users`, {
      method: 'DELETE',
      headers: {
        'Content-Type': 'application/json',
        Cookie: request.headers.get('cookie') || '',
      },
      body: JSON.stringify(body),
    });
    const data = await response.json();
    return NextResponse.json(data, { status: response.status });
  } catch (error) {
    console.error(error);
    return NextResponse.json(
      { error: 'Unable to delete admin user' },
      { status: 500 },
    );
  }
}
