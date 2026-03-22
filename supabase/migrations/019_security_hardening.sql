-- Migration 019 — Security hardening: token blacklist, security events, idempotent webhooks
-- Safe to run multiple times (IF NOT EXISTS everywhere).

-- ─── Admin token blacklist ────────────────────────────────────────────────────
-- Allows logout to invalidate tokens before their 8-hour expiry.
CREATE TABLE IF NOT EXISTS public.admin_token_blacklist (
  jti         TEXT        PRIMARY KEY,
  invalidated_at TIMESTAMPTZ DEFAULT NOW(),
  expires_at  TIMESTAMPTZ NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_blacklist_expires
  ON public.admin_token_blacklist(expires_at);

ALTER TABLE public.admin_token_blacklist ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "blacklist_service_only" ON public.admin_token_blacklist;
CREATE POLICY "blacklist_service_only" ON public.admin_token_blacklist
  FOR ALL USING (auth.role() = 'service_role');

-- ─── Security events log ─────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.security_events (
  id          UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  event_type  TEXT        NOT NULL,
  user_id     UUID,
  ip_address  TEXT,
  user_agent  TEXT,
  details     JSONB       DEFAULT '{}'::jsonb,
  severity    TEXT        DEFAULT 'info',
  created_at  TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_security_events_type_time
  ON public.security_events(event_type, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_security_events_ip
  ON public.security_events(ip_address, created_at DESC);

ALTER TABLE public.security_events ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "security_events_service_only" ON public.security_events;
CREATE POLICY "security_events_service_only" ON public.security_events
  FOR ALL USING (auth.role() = 'service_role');

-- ─── Processed webhooks (idempotency) ────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.processed_webhooks (
  stripe_event_id TEXT        PRIMARY KEY,
  processed_at    TIMESTAMPTZ DEFAULT NOW(),
  event_type      TEXT        NOT NULL
);

ALTER TABLE public.processed_webhooks ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "webhooks_service_only" ON public.processed_webhooks;
CREATE POLICY "webhooks_service_only" ON public.processed_webhooks
  FOR ALL USING (auth.role() = 'service_role');

-- ─── Helper: delete_user_completely (GDPR right to erasure) ──────────────────
-- Deletes all data for a user. Called from user/delete API after auth.admin.deleteUser.
CREATE OR REPLACE FUNCTION public.delete_user_completely(target_user_id UUID)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Order matters: delete children before parents
  DELETE FROM public.automation_rules WHERE user_id = target_user_id;
  DELETE FROM public.action_history    WHERE user_id = target_user_id;
  DELETE FROM public.import_history    WHERE user_id = target_user_id;
  DELETE FROM public.shops             WHERE user_id = target_user_id;
  DELETE FROM public.users             WHERE id      = target_user_id;
END;
$$;
