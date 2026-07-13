import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  try {
    const response = await fetch(
      `${process.env.URL || new URL(request.url).origin}/.netlify/functions/auth-logout`,
      {
        method: 'POST',
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

    return NextResponse.json({ error: 'Unable to logout' }, { status: 500 });
  }
}
