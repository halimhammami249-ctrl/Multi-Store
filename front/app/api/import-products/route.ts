import { NextRequest, NextResponse } from 'next/server';

const NETLIFY_URL =
  process.env.NETLIFY_FUNCTION_URL ||
  `${new URL(request.url).origin}/.netlify/functions`;

export async function POST(request: NextRequest) {
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

// FIX: this handler was completely missing. The frontend was polling
// POST /api/import-products?jobId=... which only ever matched the POST
// handler above (storeId + rows required), so every poll 400'd with
// "storeId required" and the import-worker function was never invoked -
// jobs got created but rows never actually processed.
export async function GET(request: NextRequest) {
  const jobId = request.nextUrl.searchParams.get('jobId');

  if (!jobId) {
    return NextResponse.json({ error: 'jobId required' }, { status: 400 });
  }

  try {
    // Each call processes one chunk of pending rows (see import-worker.js)
    // and reports current progress; the client polls this until status
    // comes back 'completed'.
    const res = await fetch(
      `${NETLIFY_URL}/import-worker?job_id=${encodeURIComponent(jobId)}`,
      { method: 'POST' },
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
