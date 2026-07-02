'use client';

import { Button } from '@/components/ui/button';
import { Loader2, Upload } from 'lucide-react';
import { useRef, useState } from 'react';
import { normalizeKey } from '@/lib/normalize-key';

export type ImageMapEntry = { url: string; publicId: string };
export type ImageMap = Record<string, ImageMapEntry>;

// How many uploads run at once. Cloudinary and most browsers handle this
// fine; higher just means more concurrent connections without much
// speedup. Tune if needed.
const CONCURRENCY = 6;

type SignResponse = {
  signature: string;
  timestamp: number;
  folder: string;
  apiKey: string;
  cloudName: string;
};

async function uploadOne(
  file: File,
  sign: SignResponse,
): Promise<ImageMapEntry> {
  const form = new FormData();
  form.append('file', file);
  form.append('api_key', sign.apiKey);
  form.append('timestamp', String(sign.timestamp));
  form.append('signature', sign.signature);
  form.append('folder', sign.folder);

  const res = await fetch(
    `https://api.cloudinary.com/v1_1/${sign.cloudName}/image/upload`,
    { method: 'POST', body: form },
  );

  const data = await res.json();

  if (!res.ok) {
    throw new Error(data?.error?.message || `Upload failed for ${file.name}`);
  }

  return { url: data.secure_url, publicId: data.public_id };
}

// Simple fixed-concurrency pool - runs `items` through `worker`, at most
// `limit` at a time, calling onProgress after each one completes.
async function runPool<T, R>(
  items: T[],
  limit: number,
  worker: (item: T) => Promise<R>,
  onProgress: (done: number, total: number) => void,
): Promise<{ results: R[]; errors: { item: T; error: unknown }[] }> {
  const results: R[] = [];
  const errors: { item: T; error: unknown }[] = [];
  let nextIndex = 0;
  let done = 0;

  async function runNext(): Promise<void> {
    const index = nextIndex++;
    if (index >= items.length) return;

    try {
      results.push(await worker(items[index]));
    } catch (error) {
      errors.push({ item: items[index], error });
    } finally {
      done += 1;
      onProgress(done, items.length);
    }

    return runNext();
  }

  await Promise.all(
    Array.from({ length: Math.min(limit, items.length) }, () => runNext()),
  );

  return { results, errors };
}

export function ImageDropZone({
  onUploaded,
}: {
  onUploaded: (map: ImageMap) => void;
}) {
  const [imageMap, setImageMap] = useState<ImageMap>({});
  const [loading, setLoading] = useState(false);
  const [progress, setProgress] = useState<{
    done: number;
    total: number;
  } | null>(null);
  const [error, setError] = useState('');

  const fileRef = useRef<HTMLInputElement>(null);

  const upload = async (files: FileList | File[]) => {
    const images = Array.from(files).filter((f) => f.type.startsWith('image/'));

    if (!images.length || loading) return;

    setLoading(true);
    setError('');
    setProgress({ done: 0, total: images.length });

    try {
      // One signature covers the whole batch - it's just server-side
      // signing, no file data, so a single call is enough even for 1,000
      // images. (Cloudinary allows some slack on the timestamp, but if a
      // batch runs long enough to matter you'd re-sign per-file instead.)
      const signRes = await fetch('/api/upload-images/sign', {
        method: 'POST',
      });
      const sign: SignResponse = await signRes.json();

      if (!signRes.ok) {
        throw new Error((sign as any)?.error || 'Could not start upload');
      }

      const { results, errors } = await runPool(
        images,
        CONCURRENCY,
        async (file) => {
          const entry = await uploadOne(file, sign);
          return { file, entry };
        },
        (done, total) => setProgress({ done, total }),
      );

      const map: ImageMap = { ...imageMap };

      for (const { file, entry } of results) {
        const nameWithoutExt = file.name.replace(/\.[^/.]+$/, '');
        map[normalizeKey(nameWithoutExt)] = entry;
      }

      setImageMap(map);
      onUploaded(map);

      if (errors.length) {
        setError(
          `${errors.length} of ${images.length} image(s) failed to upload`,
        );
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Upload error');
    } finally {
      setLoading(false);
      setProgress(null);
    }
  };

  return (
    <div className="border rounded-lg p-4 space-y-3">
      <div className="flex gap-3 items-center">
        <Upload />
        <p className="font-medium">Upload images</p>
      </div>

      <input
        ref={fileRef}
        type="file"
        multiple
        accept="image/*"
        className="hidden"
        onChange={(e) => e.target.files && upload(e.target.files)}
      />

      <Button
        type="button"
        disabled={loading}
        onClick={() => fileRef.current?.click()}
      >
        {loading ? (
          <Loader2 className="animate-spin" size={16} />
        ) : (
          'Select Images'
        )}
      </Button>

      {progress && (
        <p className="text-sm text-muted-foreground">
          Uploading {progress.done}/{progress.total}...
        </p>
      )}

      {error && <p className="text-red-500 text-sm">{error}</p>}
    </div>
  );
}
