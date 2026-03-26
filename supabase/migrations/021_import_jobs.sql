-- Migration 021 — Import Jobs System
-- Adds import_jobs table for tracking bulk import operations with retry support

-- ─── Import Jobs Table ────────────────────────────────────────────────────────
-- Tracks bulk import operations with progress, retry count, and detailed results
CREATE TABLE IF NOT EXISTS public.import_jobs (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id         UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  platform        TEXT NOT NULL,
  source_urls     TEXT[] NOT NULL,
  status          TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'processing', 'completed', 'failed', 'partial')),
  total_products  INTEGER NOT NULL DEFAULT 0,
  imported_count  INTEGER NOT NULL DEFAULT 0,
  failed_count    INTEGER NOT NULL DEFAULT 0,
  retry_count     INTEGER NOT NULL DEFAULT 0,
  max_retries     INTEGER NOT NULL DEFAULT 3,
  results         JSONB DEFAULT '[]'::jsonb,
  error_details   JSONB DEFAULT '[]'::jsonb,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  completed_at    TIMESTAMPTZ
);

ALTER TABLE public.import_jobs ENABLE ROW LEVEL SECURITY;

-- RLS Policies
DROP POLICY IF EXISTS "Users can view own import jobs" ON public.import_jobs;
CREATE POLICY "Users can view own import jobs"
  ON public.import_jobs FOR SELECT
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can create own import jobs" ON public.import_jobs;
CREATE POLICY "Users can create own import jobs"
  ON public.import_jobs FOR INSERT
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update own import jobs" ON public.import_jobs;
CREATE POLICY "Users can update own import jobs"
  ON public.import_jobs FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Service role full access to import jobs"
  ON public.import_jobs FOR ALL
  USING (auth.role() = 'service_role');

-- ─── Import Job Items (for granular retry tracking) ─────────────────────────
-- Individual items within an import job for precise retry logic
CREATE TABLE IF NOT EXISTS public.import_job_items (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  job_id          UUID NOT NULL REFERENCES public.import_jobs(id) ON DELETE CASCADE,
  url             TEXT NOT NULL,
  status          TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'success', 'failed', 'retrying')),
  retry_count     INTEGER NOT NULL DEFAULT 0,
  max_retries     INTEGER NOT NULL DEFAULT 3,
  product_data    JSONB,
  shopify_id      TEXT,
  error_message   TEXT,
  last_error      TEXT,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE public.import_job_items ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view own import job items" ON public.import_job_items;
CREATE POLICY "Users can view own import job items"
  ON public.import_job_items FOR SELECT
  USING ( EXISTS (
    SELECT 1 FROM public.import_jobs 
    WHERE import_jobs.id = import_job_items.job_id 
    AND import_jobs.user_id = auth.uid()
  ));

CREATE POLICY "Service role full access to import job items"
  ON public.import_job_items FOR ALL
  USING (auth.role() = 'service_role');

-- ─── Indexes for Performance ─────────────────────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_import_jobs_user_id ON public.import_jobs(user_id);
CREATE INDEX IF NOT EXISTS idx_import_jobs_status ON public.import_jobs(status);
CREATE INDEX IF NOT EXISTS idx_import_jobs_created_at ON public.import_jobs(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_import_job_items_job_id ON public.import_job_items(job_id);
CREATE INDEX IF NOT EXISTS idx_import_job_items_status ON public.import_job_items(status);
CREATE INDEX IF NOT EXISTS idx_import_job_items_retry ON public.import_job_items(retry_count, status);

-- ─── Trigger: Update timestamp ───────────────────────────────────────────────
CREATE TRIGGER update_import_jobs_updated_at
  BEFORE UPDATE ON public.import_jobs
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_import_job_items_updated_at
  BEFORE UPDATE ON public.import_job_items
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ─── Function: Retry Failed Import Items ─────────────────────────────────────
-- Automatically queues failed items for retry (up to max_retries)
CREATE OR REPLACE FUNCTION public.retry_failed_import_items(p_job_id UUID)
RETURNS TABLE(item_id UUID, url TEXT)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  UPDATE public.import_job_items
  SET 
    status = 'retrying',
    retry_count = retry_count + 1,
    updated_at = NOW(),
    last_error = NULL
  WHERE job_id = p_job_id
    AND status = 'failed'
    AND retry_count < max_retries
  RETURNING id, url;
END;
$$;

-- ─── Function: Get Import Job Statistics ─────────────────────────────────────
CREATE OR REPLACE FUNCTION public.get_import_job_stats(p_user_id UUID)
RETURNS TABLE(
  total_jobs BIGINT,
  completed_jobs BIGINT,
  failed_jobs BIGINT,
  total_imported BIGINT,
  total_failed BIGINT
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    COUNT(*)::BIGINT,
    COUNT(*) FILTER (WHERE status = 'completed')::BIGINT,
    COUNT(*) FILTER (WHERE status = 'failed')::BIGINT,
    COALESCE(SUM(imported_count), 0)::BIGINT,
    COALESCE(SUM(failed_count), 0)::BIGINT
  FROM public.import_jobs
  WHERE user_id = p_user_id;
END;
$$;

-- ─── Function: Cleanup Old Import Jobs (run monthly) ─────────────────────────
CREATE OR REPLACE FUNCTION public.cleanup_old_import_jobs(p_retention_days INTEGER DEFAULT 90)
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_deleted_count INTEGER;
BEGIN
  -- Delete old completed/failed jobs
  DELETE FROM public.import_jobs
  WHERE status IN ('completed', 'failed')
    AND created_at < NOW() - (p_retention_days || ' days')::INTERVAL;
  
  GET DIAGNOSTICS v_deleted_count = ROW_COUNT;
  RETURN v_deleted_count;
END;
$$;

COMMENT ON FUNCTION public.cleanup_old_import_jobs IS 'Deletes import jobs older than specified retention period (default 90 days)';
