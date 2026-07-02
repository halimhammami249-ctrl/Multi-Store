import { NextRequest, NextResponse } from 'next/server'

export async function GET(request: NextRequest) {
  try {
    const response = await fetch('http://localhost:8888/.netlify/functions/auth-me', {
      method: 'GET',
      headers: {
        Cookie: request.headers.get('cookie') || '',
      },
      cache: 'no-store',
    })
    const data = await response.json()

    return NextResponse.json(data, { status: response.status })
  } catch (error) {
    console.error(error)

    return NextResponse.json({ error: 'Unable to load current user' }, { status: 500 })
  }
}
