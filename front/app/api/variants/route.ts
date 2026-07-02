import { NextRequest, NextResponse } from 'next/server'

export async function GET(request: NextRequest) {
  const storeId = request.nextUrl.searchParams.get('storeId')
  const productId = request.nextUrl.searchParams.get('productId')

  if (!storeId || !productId) {
    return NextResponse.json({ error: 'storeId and productId are required' }, { status: 400 })
  }

  const response = await fetch(
    `http://localhost:8888/.netlify/functions/variants?store_id=${storeId}&product_id=${productId}`,
    { cache: 'no-store' },
  )
  const data = await response.json()

  return NextResponse.json(data, { status: response.status })
}

export async function POST(request: NextRequest) {
  const storeId = request.nextUrl.searchParams.get('storeId')
  const productId = request.nextUrl.searchParams.get('productId')

  if (!storeId || !productId) {
    return NextResponse.json({ error: 'storeId and productId are required' }, { status: 400 })
  }

  const body = await request.json()
  const response = await fetch(
    `http://localhost:8888/.netlify/functions/variants?store_id=${storeId}&product_id=${productId}`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    },
  )
  const data = await response.json()

  return NextResponse.json(data, { status: response.status })
}

export async function PUT(request: NextRequest) {
  const storeId = request.nextUrl.searchParams.get('storeId')

  if (!storeId) {
    return NextResponse.json({ error: 'storeId is required' }, { status: 400 })
  }

  const body = await request.json()
  const response = await fetch(
    `http://localhost:8888/.netlify/functions/variants?store_id=${storeId}`,
    {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    },
  )
  const data = await response.json()

  return NextResponse.json(data, { status: response.status })
}
