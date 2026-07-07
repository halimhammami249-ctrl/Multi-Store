'use client';

import { DashboardLayout } from '@/components/dashboard-layout';
import { Button } from '@/components/ui/button';
import { useStore } from '@/lib/store-context';
import { AlertCircle, Loader2, Upload } from 'lucide-react';
import { useState } from 'react';
import { ImageDropZone, type ImageMap } from '@/components/image-drop-zone';
import { normalizeKey } from '@/lib/normalize-key';

interface ImportResult {
  success: boolean;
  jobId?: string;
  status?: string;
  totalRows?: number;
  processedRows?: number;
  imported: number;
  updated: number;
  failed: number;
  errors: any[];
}

export default function ImportPage() {
  const { selectedStore, stores, setSelectedStore } = useStore();

  const [excelFile, setExcelFile] = useState<File | null>(null);
  const [imageMap, setImageMap] = useState<ImageMap>({});
  const [imagesUploading, setImagesUploading] = useState(false);
  const [isImporting, setIsImporting] = useState(false);
  const [result, setResult] = useState<ImportResult | null>(null);

  const parseExcel = async (file: File) => {
    const XLSX = await import('xlsx');

    const buffer = await file.arrayBuffer();
    const workbook = XLSX.read(buffer, { type: 'buffer' });
    const sheet = workbook.SheetNames[0];

    return XLSX.utils.sheet_to_json(workbook.Sheets[sheet], {
      defval: '',
    });
  };

  const pollJob = async (jobId: string) => {
    let status = 'processing';

    while (status === 'processing') {
      // FIX: GET (not POST) against the jobId status route. The old code
      // POSTed to the same endpoint used to create jobs, which has no
      // jobId handling at all and just 400'd immediately - meaning jobs
      // were created but the worker was never actually invoked.
      const r = await fetch(
        `/api/import-products?jobId=${encodeURIComponent(jobId)}`,
        { method: 'GET' },
      );

      const text = await r.text();
      let d: any = {};

      try {
        d = text ? JSON.parse(text) : {};
      } catch {
        console.error('Invalid worker response:', text);
        break;
      }

      if (!r.ok) {
        setResult((prev) => ({
          success: false,
          imported: prev?.imported ?? 0,
          updated: prev?.updated ?? 0,
          failed: prev?.failed ?? 0,
          errors: [
            {
              row: null,
              product: '',
              error: d?.error || 'Status check failed',
            },
          ],
        }));
        break;
      }

      setResult(d);
      status = d.status || 'completed';

      // SCALE: the worker now resolves brands/categories in bulk per
      // chunk and relocates images in parallel instead of serially, so
      // chunks finish much faster than before. The old flat 800ms wait
      // between polls was fine for a slow worker but is now just dead
      // time on every poll - at 500+ rows that adds up to real seconds
      // of the progress bar sitting idle for no reason. 250ms keeps the
      // UI responsive without polling so fast it's wasteful.
      if (status === 'processing') {
        await new Promise((res) => setTimeout(res, 250));
      }
    }
  };

  const handleImport = async () => {
    if (!selectedStore || !excelFile || isImporting) return;

    setIsImporting(true);
    setResult(null);

    try {
      const rawRows = await parseExcel(excelFile);

      const rows = rawRows.map((row: any) => {
        const sku = row.sku || row.variant_sku || '';
        const name = row.name || row.product || row.title || '';
        const filename = row.image || row.image_filename || row.filename || '';

        const matchedImage =
          imageMap[normalizeKey(sku)] ||
          imageMap[normalizeKey(name)] ||
          imageMap[normalizeKey(filename)];

        return {
          name,
          brand: row.brand || '',
          category: row.category || '',
          price: Number(row.price || 0),
          sku,
          stock: Number(row.stock || 0),
          description: row.description || '',

          imageUrl: matchedImage?.url || '',
          // publicId lets the worker move the file into its final folder
          // with a cheap Cloudinary rename instead of downloading and
          // re-uploading the whole image (see import-worker.js).
          imagePublicId: matchedImage?.publicId || '',
        };
      });

      const res = await fetch(
        `/api/import-products?storeId=${selectedStore.id}`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ rows }),
        },
      );

      const data = await res.json().catch(() => null);

      if (!res.ok) {
        throw new Error(data?.error || 'Import failed');
      }

      setResult(data);

      if (data.jobId) {
        await pollJob(data.jobId);
      }
    } catch (err) {
      setResult({
        success: false,
        imported: 0,
        updated: 0,
        failed: 1,
        errors: [
          {
            row: null,
            product: '',
            error: err instanceof Error ? err.message : 'Import failed',
          },
        ],
      });
    } finally {
      setIsImporting(false);
    }
  };

  if (!selectedStore) {
    return (
      <DashboardLayout title="Import Catalog">
        <div className="flex flex-col items-center justify-center py-12">
          <AlertCircle className="text-muted-foreground mb-4" size={48} />
          <h2 className="text-xl font-semibold">No Store Selected</h2>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout title="Import Catalog">
      <div className="space-y-6 max-w-5xl">
        <select
          value={selectedStore.id}
          onChange={(e) => {
            const store = stores.find((s) => s.id === e.target.value);
            setSelectedStore(store || null);
          }}
          className="w-full p-2 border rounded"
        >
          {stores.map((s) => (
            <option key={s.id} value={s.id}>
              {s.name}
            </option>
          ))}
        </select>

        <input
          type="file"
          accept=".xlsx"
          onChange={(e) => setExcelFile(e.target.files?.[0] || null)}
        />

        <ImageDropZone
          onUploaded={setImageMap}
          onUploadingChange={setImagesUploading}
        />

        <Button
          onClick={handleImport}
          disabled={!excelFile || isImporting || imagesUploading}
        >
          {isImporting ? (
            <Loader2 className="animate-spin" size={16} />
          ) : (
            <Upload size={16} />
          )}
          {imagesUploading ? 'Waiting for images…' : 'Import'}
        </Button>

        {result && (
          <div className="border p-4 rounded-lg space-y-1">
            {result.status && (
              <p className="text-sm text-muted-foreground">
                Status: {result.status}
                {typeof result.processedRows === 'number' &&
                  typeof result.totalRows === 'number' &&
                  ` (${result.processedRows}/${result.totalRows} rows)`}
              </p>
            )}
            <p>
              {result.imported ?? 0} imported / {result.updated ?? 0} updated /{' '}
              {result.failed ?? 0} failed
            </p>
            {!!result.errors?.length && (
              <ul className="text-red-500 text-sm list-disc pl-5">
                {result.errors.slice(0, 10).map((e, i) => (
                  <li key={i}>{e.error}</li>
                ))}
              </ul>
            )}
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}
