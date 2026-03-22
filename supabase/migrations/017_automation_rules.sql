-- Migration 017 — Automation rules table (replaces in-memory store)
-- Run in Supabase SQL editor before deploying.

CREATE TABLE IF NOT EXISTS public.automation_rules (
  id               UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id          UUID        NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name             TEXT        NOT NULL,
  description      TEXT,
  condition_type   TEXT        NOT NULL,
  condition_value  TEXT,
  action_type      TEXT        NOT NULL,
  action_value     TEXT,
  enabled          BOOLEAN     NOT NULL DEFAULT true,
  run_count        INTEGER     NOT NULL DEFAULT 0,
  last_run         TIMESTAMPTZ,
  created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at       TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_automation_rules_user
  ON public.automation_rules (user_id);

ALTER TABLE public.automation_rules ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "automation_select_own"  ON public.automation_rules;
DROP POLICY IF EXISTS "automation_insert_own"  ON public.automation_rules;
DROP POLICY IF EXISTS "automation_update_own"  ON public.automation_rules;
DROP POLICY IF EXISTS "automation_delete_own"  ON public.automation_rules;
DROP POLICY IF EXISTS "automation_service"     ON public.automation_rules;

CREATE POLICY "automation_select_own" ON public.automation_rules
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "automation_insert_own" ON public.automation_rules
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "automation_update_own" ON public.automation_rules
  FOR UPDATE USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

CREATE POLICY "automation_delete_own" ON public.automation_rules
  FOR DELETE USING (auth.uid() = user_id);

CREATE POLICY "automation_service" ON public.automation_rules
  FOR ALL USING (auth.role() = 'service_role');
