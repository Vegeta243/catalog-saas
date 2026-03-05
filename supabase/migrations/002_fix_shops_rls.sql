-- ============================================================
-- Migration 002 : Fix RLS policies on shops table
-- CRITICAL: Fixes user isolation (shops were visible to ALL users)
-- Run this in Supabase SQL Editor:
-- https://supabase.com/dashboard/project/mhroujagzclmdlfpiqju/sql/new
-- ============================================================

-- Drop ALL existing shop policies (including any from initial_schema)
DROP POLICY IF EXISTS "shops_select_own" ON public.shops;
DROP POLICY IF EXISTS "shops_insert_own" ON public.shops;
DROP POLICY IF EXISTS "shops_update_own" ON public.shops;
DROP POLICY IF EXISTS "shops_delete_own" ON public.shops;
DROP POLICY IF EXISTS "shops_service_role" ON public.shops;
DROP POLICY IF EXISTS "Users can view own shops" ON public.shops;
DROP POLICY IF EXISTS "Users can manage own shops" ON public.shops;
DROP POLICY IF EXISTS "Service role full access to shops" ON public.shops;

-- Users can only SELECT their own shops
CREATE POLICY "shops_select_own" ON public.shops
  FOR SELECT USING (user_id = auth.uid());

-- Users can only INSERT shops linked to themselves
CREATE POLICY "shops_insert_own" ON public.shops
  FOR INSERT WITH CHECK (user_id = auth.uid());

-- Users can only UPDATE their own shops
CREATE POLICY "shops_update_own" ON public.shops
  FOR UPDATE USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

-- Users can only DELETE their own shops
CREATE POLICY "shops_delete_own" ON public.shops
  FOR DELETE USING (user_id = auth.uid());

-- Service role can do everything (for webhooks, Shopify callback, etc.)
CREATE POLICY "shops_service_role" ON public.shops
  FOR ALL USING (auth.role() = 'service_role');
