import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const response = await fetch(
      `${new URL(request.url).origin}/.netlify/functions/auth-login`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      },
    );
    const data = await response.json();
    const nextResponse = NextResponse.json(data, { status: response.status });
    const cookie = response.headers.get('set-cookie');

    if (cookie) {
      nextResponse.headers.set('Set-Cookie', cookie);
    }

    return nextResponse;
  } catch (error) {
    console.error(error);

    return NextResponse.json({ error: 'Unable to login' }, { status: 500 });
  }
}
