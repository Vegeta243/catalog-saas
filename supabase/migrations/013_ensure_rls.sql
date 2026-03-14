-- ═══════════════════════════════════════════════════════════════════
-- Migration 013 — Consolidate & reinforce Row Level Security
-- Run in Supabase SQL Editor: https://supabase.com/dashboard/project/mhroujagzclmdlfpiqju/sql/new
-- ═══════════════════════════════════════════════════════════════════
-- This migration ensures every data table has RLS enabled and
-- that each user can only access their own rows.
-- Safe to run multiple times (uses IF NOT EXISTS / DROP IF EXISTS).
-- ═══════════════════════════════════════════════════════════════════

-- ─── users ────────────────────────────────────────────────────────
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "users_select_own"   ON public.users;
DROP POLICY IF EXISTS "users_update_own"   ON public.users;
DROP POLICY IF EXISTS "users_insert_own"   ON public.users;
DROP POLICY IF EXISTS "users_service_role" ON public.users;

CREATE POLICY "users_select_own"   ON public.users FOR SELECT USING (auth.uid() = id);
CREATE POLICY "users_update_own"   ON public.users FOR UPDATE USING (auth.uid() = id) WITH CHECK (auth.uid() = id);
CREATE POLICY "users_insert_own"   ON public.users FOR INSERT WITH CHECK (auth.uid() = id);
-- service role (webhooks, admin API) can do everything
CREATE POLICY "users_service_role" ON public.users FOR ALL USING (auth.role() = 'service_role');

-- ─── shops ────────────────────────────────────────────────────────
ALTER TABLE public.shops ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "shops_select_own"   ON public.shops;
DROP POLICY IF EXISTS "shops_insert_own"   ON public.shops;
DROP POLICY IF EXISTS "shops_update_own"   ON public.shops;
DROP POLICY IF EXISTS "shops_delete_own"   ON public.shops;
DROP POLICY IF EXISTS "shops_service_role" ON public.shops;

CREATE POLICY "shops_select_own"   ON public.shops FOR SELECT USING (user_id = auth.uid());
CREATE POLICY "shops_insert_own"   ON public.shops FOR INSERT WITH CHECK (user_id = auth.uid());
CREATE POLICY "shops_update_own"   ON public.shops FOR UPDATE USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());
CREATE POLICY "shops_delete_own"   ON public.shops FOR DELETE USING (user_id = auth.uid());
CREATE POLICY "shops_service_role" ON public.shops FOR ALL USING (auth.role() = 'service_role');

-- ─── action_history ───────────────────────────────────────────────
ALTER TABLE public.action_history ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "action_history_select_own"   ON public.action_history;
DROP POLICY IF EXISTS "action_history_insert_own"   ON public.action_history;
DROP POLICY IF EXISTS "action_history_service_role" ON public.action_history;

CREATE POLICY "action_history_select_own"   ON public.action_history FOR SELECT USING (user_id = auth.uid());
CREATE POLICY "action_history_insert_own"   ON public.action_history FOR INSERT WITH CHECK (user_id = auth.uid());
CREATE POLICY "action_history_service_role" ON public.action_history FOR ALL USING (auth.role() = 'service_role');

-- ─── import_history ───────────────────────────────────────────────
ALTER TABLE public.import_history ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "import_history_select_own"   ON public.import_history;
DROP POLICY IF EXISTS "import_history_insert_own"   ON public.import_history;
DROP POLICY IF EXISTS "import_history_service_role" ON public.import_history;

CREATE POLICY "import_history_select_own"   ON public.import_history FOR SELECT USING (user_id = auth.uid());
CREATE POLICY "import_history_insert_own"   ON public.import_history FOR INSERT WITH CHECK (user_id = auth.uid());
CREATE POLICY "import_history_service_role" ON public.import_history FOR ALL USING (auth.role() = 'service_role');

-- ─── competitors ──────────────────────────────────────────────────
ALTER TABLE public.competitors ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users own competitors" ON public.competitors;
CREATE POLICY "Users own competitors" ON public.competitors FOR ALL USING (auth.uid() = user_id);

-- ─── competitor_snapshots ─────────────────────────────────────────
ALTER TABLE public.competitor_snapshots ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users own snapshots" ON public.competitor_snapshots;
CREATE POLICY "Users own snapshots" ON public.competitor_snapshots FOR ALL USING (auth.uid() = user_id);

-- ─── calendar_events ──────────────────────────────────────────────
ALTER TABLE public.calendar_events ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users own calendar_events" ON public.calendar_events;
CREATE POLICY "Users own calendar_events" ON public.calendar_events FOR ALL USING (auth.uid() = user_id);

-- ─── user_profit_settings ─────────────────────────────────────────
ALTER TABLE public.user_profit_settings ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users own profit settings" ON public.user_profit_settings;
CREATE POLICY "Users own profit settings" ON public.user_profit_settings FOR ALL USING (auth.uid() = user_id);

-- ─── product_costs ────────────────────────────────────────────────
ALTER TABLE public.product_costs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users own product costs" ON public.product_costs;
CREATE POLICY "Users own product costs" ON public.product_costs FOR ALL USING (auth.uid() = user_id);

-- ─── admin_audit_log ──────────────────────────────────────────────
-- Admin logs are service-role only — no authenticated access
ALTER TABLE public.admin_audit_log ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "service role only" ON public.admin_audit_log;
CREATE POLICY "service role only" ON public.admin_audit_log
  USING (false) WITH CHECK (false);

-- ═══════════════════════════════════════════════════════════════════
-- VERIFICATION QUERY (run separately to confirm)
-- ═══════════════════════════════════════════════════════════════════
-- SELECT tablename, rowsecurity
-- FROM pg_tables
-- WHERE schemaname = 'public'
-- ORDER BY tablename;
