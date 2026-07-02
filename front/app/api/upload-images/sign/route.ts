import { NextResponse } from 'next/server';
import { v2 as cloudinary } from 'cloudinary';

function isConfigured() {
  return (
    process.env.CLOUDINARY_CLOUD_NAME &&
    process.env.CLOUDINARY_API_KEY &&
    process.env.CLOUDINARY_API_SECRET
  );
}

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME!,
  api_key: process.env.CLOUDINARY_API_KEY!,
  api_secret: process.env.CLOUDINARY_API_SECRET!,
});

/**
 * SCALABILITY FIX: this replaces routing every image's raw bytes through
 * our own serverless function before they reach Cloudinary. That old
 * approach (see the old /api/upload-images/route.ts) uploaded files to
 * Cloudinary one at a time, inside a single function invocation, for the
 * whole batch - which times out well before 1,000 images finish and eats
 * the function's request body limit long before that.
 *
 * This endpoint does almost nothing: it signs a set of upload parameters
 * (cheap, no file data involved) and returns them. The browser then
 * uploads directly to Cloudinary's API using that signature - our server
 * is never in the data path at all, so there's no timeout or body-size
 * ceiling tied to how many images are being uploaded.
 *
 * We use a SIGNED upload (not an unsigned upload preset) on purpose:
 * an unsigned preset embedded in client JS lets anyone who inspects the
 * bundle upload arbitrary files to this Cloudinary account indefinitely.
 * A signature is single-use and time-boxed (Cloudinary rejects a stale
 * timestamp), which keeps the API secret server-side where it belongs.
 */
export async function POST() {
  if (!isConfigured()) {
    return NextResponse.json(
      { error: 'Cloudinary env missing' },
      { status: 500 },
    );
  }

  const timestamp = Math.round(Date.now() / 1000);
  const folder = 'imports/tmp';

  const paramsToSign = { timestamp, folder };

  const signature = cloudinary.utils.api_sign_request(
    paramsToSign,
    process.env.CLOUDINARY_API_SECRET!,
  );

  return NextResponse.json({
    signature,
    timestamp,
    folder,
    apiKey: process.env.CLOUDINARY_API_KEY,
    cloudName: process.env.CLOUDINARY_CLOUD_NAME,
  });
}
