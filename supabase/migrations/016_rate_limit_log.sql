-- Migration 016 — Rate limit log table (Supabase-backed, serverless-safe)
-- Run in Supabase SQL editor before deploying.

CREATE TABLE IF NOT EXISTS public.rate_limit_log (
  id         UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  key        TEXT        NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_rate_limit_key_time
  ON public.rate_limit_log (key, created_at);

ALTER TABLE public.rate_limit_log ENABLE ROW LEVEL SECURITY;

-- Only the service role can read/write rate-limit records
DROP POLICY IF EXISTS "rl_service_only" ON public.rate_limit_log;
CREATE POLICY "rl_service_only" ON public.rate_limit_log
  FOR ALL USING (auth.role() = 'service_role');

-- Auto-cleanup old entries every time the cron runs (optional, but keeps table lean)
-- You can also schedule: DELETE FROM rate_limit_log WHERE created_at < NOW() - INTERVAL '24 hours';
