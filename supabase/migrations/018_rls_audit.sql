-- Migration 018 — RLS audit + fix any gaps
-- Safe to run multiple times.

-- ─── products (if exists) ─────────────────────────────────────────────────
DO $$
BEGIN
  IF EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'products') THEN
    ALTER TABLE public.products ENABLE ROW LEVEL SECURITY;

    DROP POLICY IF EXISTS "products_select_own"   ON public.products;
    DROP POLICY IF EXISTS "products_insert_own"   ON public.products;
    DROP POLICY IF EXISTS "products_update_own"   ON public.products;
    DROP POLICY IF EXISTS "products_delete_own"   ON public.products;
    DROP POLICY IF EXISTS "products_service_role" ON public.products;

    CREATE POLICY "products_select_own"   ON public.products FOR SELECT USING (user_id = auth.uid());
    CREATE POLICY "products_insert_own"   ON public.products FOR INSERT WITH CHECK (user_id = auth.uid());
    CREATE POLICY "products_update_own"   ON public.products FOR UPDATE USING (user_id = auth.uid());
    CREATE POLICY "products_delete_own"   ON public.products FOR DELETE USING (user_id = auth.uid());
    CREATE POLICY "products_service_role" ON public.products FOR ALL USING (auth.role() = 'service_role');
  END IF;
END $$;

-- ─── referrals (if exists) ───────────────────────────────────────────────
DO $$
BEGIN
  IF EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'referrals') THEN
    ALTER TABLE public.referrals ENABLE ROW LEVEL SECURITY;

    DROP POLICY IF EXISTS "referrals_select_own"   ON public.referrals;
    DROP POLICY IF EXISTS "referrals_service_role" ON public.referrals;

    CREATE POLICY "referrals_select_own"   ON public.referrals
      FOR SELECT USING (referrer_id = auth.uid() OR referred_id = auth.uid());
    CREATE POLICY "referrals_service_role" ON public.referrals
      FOR ALL USING (auth.role() = 'service_role');
  END IF;
END $$;

-- ─── support_tickets (if exists) ─────────────────────────────────────────
DO $$
BEGIN
  IF EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'support_tickets') THEN
    ALTER TABLE public.support_tickets ENABLE ROW LEVEL SECURITY;

    DROP POLICY IF EXISTS "support_select_own"   ON public.support_tickets;
    DROP POLICY IF EXISTS "support_service_role" ON public.support_tickets;

    CREATE POLICY "support_select_own"   ON public.support_tickets
      FOR SELECT USING (user_id = auth.uid());
    CREATE POLICY "support_service_role" ON public.support_tickets
      FOR ALL USING (auth.role() = 'service_role');
  END IF;
END $$;

-- ─── Verify all public tables have RLS enabled ───────────────────────────
-- Run this query to see any tables still missing RLS:
-- SELECT tablename FROM pg_tables
-- WHERE schemaname = 'public' AND rowsecurity = false
-- ORDER BY tablename;
