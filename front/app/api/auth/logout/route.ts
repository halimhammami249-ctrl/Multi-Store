import { NextResponse } from 'next/server'

export async function POST() {
  try {
    const response = await fetch('http://localhost:8888/.netlify/functions/auth-logout', {
      method: 'POST',
    })
    const data = await response.json()
    const nextResponse = NextResponse.json(data, { status: response.status })
    const cookie = response.headers.get('set-cookie')

    if (cookie) {
      nextResponse.headers.set('Set-Cookie', cookie)
    }

    return nextResponse
  } catch (error) {
    console.error(error)

    return NextResponse.json({ error: 'Unable to logout' }, { status: 500 })
  }
}
