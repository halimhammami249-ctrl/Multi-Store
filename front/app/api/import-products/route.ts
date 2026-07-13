import { NextRequest, NextResponse } from 'next/server';

function getFunctionsBase(request: NextRequest) {
  return (
    process.env.NETLIFY_FUNCTION_URL ||
    `${process.env.URL || new URL(request.url).origin}/.netlify/functions`
  );
}

export async function POST(request: NextRequest) {
  const NETLIFY_URL = getFunctionsBase(request);
  const storeId = request.nextUrl.searchParams.get('storeId');
  if (!storeId) {
    return NextResponse.json({ error: 'storeId required' }, { status: 400 });
  }
  let body;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
  }
  const rows = body?.rows;
  if (!Array.isArray(rows) || rows.length === 0) {
    return NextResponse.json({ error: 'rows required' }, { status: 400 });
  }
  try {
    const res = await fetch(
      `${NETLIFY_URL}/import-products?store_id=${storeId}`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Cookie: request.headers.get('cookie') || '',
        },
        body: JSON.stringify({ rows }),
      },
    );
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      return NextResponse.json(
        {
          error: data?.error || 'Import failed',
          debug: data,
        },
        { status: res.status },
      );
    }
    return NextResponse.json(data);
  } catch (err) {
    return NextResponse.json(
      {
        error:
          err instanceof Error ? err.message : 'Network error calling worker',
      },
      { status: 500 },
    );
  }
}

export async function GET(request: NextRequest) {
  const NETLIFY_URL = getFunctionsBase(request);
  const jobId = request.nextUrl.searchParams.get('jobId');
  if (!jobId) {
    return NextResponse.json({ error: 'jobId required' }, { status: 400 });
  }
  try {
    const res = await fetch(
      `${NETLIFY_URL}/import-worker?job_id=${encodeURIComponent(jobId)}`,
      {
        method: 'POST',
        headers: { Cookie: request.headers.get('cookie') || '' },
      },
    );
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      return NextResponse.json(
        {
          error: data?.error || 'Status check failed',
          debug: data,
        },
        { status: res.status },
      );
    }
    return NextResponse.json(data);
  } catch (err) {
    return NextResponse.json(
      {
        error:
          err instanceof Error ? err.message : 'Network error calling worker',
      },
      { status: 500 },
    );
  }
}
