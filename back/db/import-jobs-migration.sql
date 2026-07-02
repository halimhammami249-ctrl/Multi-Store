CREATE EXTENSION IF NOT EXISTS "pgcrypto";

CREATE TABLE IF NOT EXISTS import_jobs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  store_id UUID NOT NULL REFERENCES stores(id) ON DELETE CASCADE,
  status TEXT NOT NULL DEFAULT 'queued'
    CHECK (status IN ('queued', 'processing', 'completed', 'failed')),
  total_rows INT NOT NULL DEFAULT 0 CHECK (total_rows >= 0),
  processed_rows INT NOT NULL DEFAULT 0 CHECK (processed_rows >= 0),
  imported INT NOT NULL DEFAULT 0 CHECK (imported >= 0),
  updated INT NOT NULL DEFAULT 0 CHECK (updated >= 0),
  failed INT NOT NULL DEFAULT 0 CHECK (failed >= 0),
  error TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  completed_at TIMESTAMPTZ
);

CREATE TABLE IF NOT EXISTS import_job_rows (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  job_id UUID NOT NULL REFERENCES import_jobs(id) ON DELETE CASCADE,
  row_number INT NOT NULL,
  payload JSONB NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending', 'processing', 'completed', 'failed')),
  product_id UUID,
  variant_id UUID,
  error TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (job_id, row_number)
);

CREATE INDEX IF NOT EXISTS idx_import_jobs_store_id ON import_jobs(store_id);
CREATE INDEX IF NOT EXISTS idx_import_jobs_status ON import_jobs(status);
CREATE INDEX IF NOT EXISTS idx_import_job_rows_job_status ON import_job_rows(job_id, status, row_number);

DROP TRIGGER IF EXISTS set_import_jobs_updated_at ON import_jobs;
CREATE TRIGGER set_import_jobs_updated_at
BEFORE UPDATE ON import_jobs
FOR EACH ROW EXECUTE FUNCTION set_updated_at();

DROP TRIGGER IF EXISTS set_import_job_rows_updated_at ON import_job_rows;
CREATE TRIGGER set_import_job_rows_updated_at
BEFORE UPDATE ON import_job_rows
FOR EACH ROW EXECUTE FUNCTION set_updated_at();
