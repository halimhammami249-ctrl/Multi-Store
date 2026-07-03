import { NextRequest, NextResponse } from 'next/server'

export async function GET(request: NextRequest) {
  const storeId = request.nextUrl.searchParams.get('storeId')

  if (!storeId) {
    return NextResponse.json({ error: 'storeId is required' }, { status: 400 })
  }

  try {
    const response = await fetch(
      `${(process.env.URL || new URL(request.url).origin)}/.netlify/functions/attributes?store_id=${storeId}`,
      { cache: 'no-store' },
    )
    const data = await response.json()

    return NextResponse.json(data, { status: response.status })
  } catch (error) {
    console.error(error)

    return NextResponse.json(
      { error: 'Unable to fetch attributes' },
      { status: 500 },
    )
  }
}

export async function POST(request: NextRequest) {
  const storeId = request.nextUrl.searchParams.get('storeId')

  if (!storeId) {
    return NextResponse.json({ error: 'storeId is required' }, { status: 400 })
  }

  try {
    const body = await request.json()

    const response = await fetch(
      `${(process.env.URL || new URL(request.url).origin)}/.netlify/functions/attributes?store_id=${storeId}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      },
    )
    const data = await response.json()

    return NextResponse.json(data, { status: response.status })
  } catch (error) {
    console.error(error)

    return NextResponse.json(
      { error: 'Failed to create attribute' },
      { status: 400 }
    )
  }
}

export async function DELETE(request: NextRequest) {
  const storeId = request.nextUrl.searchParams.get('storeId')

  if (!storeId) {
    return NextResponse.json({ error: 'storeId is required' }, { status: 400 })
  }

  try {
    const body = await request.json()

    const response = await fetch(
      `${(process.env.URL || new URL(request.url).origin)}/.netlify/functions/attributes?store_id=${storeId}`,
      {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      },
    )
    const data = await response.json()

    return NextResponse.json(data, { status: response.status })
  } catch (error) {
    console.error(error)

    return NextResponse.json(
      { error: 'Failed to delete attribute' },
      { status: 400 }
    )
  }
}
