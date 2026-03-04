-- ════════════════════════════════════════════════════════════
-- EcomPilot — Initial Database Schema
-- Run this in Supabase SQL Editor to set up the database
-- ════════════════════════════════════════════════════════════

-- ────────────────────────────────────────────────────────────
-- 1. PROFILES (customer data, linked to auth.users)
-- ────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.profiles (
  id            UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email         TEXT NOT NULL,
  first_name    TEXT,
  last_name     TEXT,
  plan          TEXT NOT NULL DEFAULT 'starter' CHECK (plan IN ('starter', 'pro', 'scale')),
  plan_status   TEXT NOT NULL DEFAULT 'trial' CHECK (plan_status IN ('trial', 'active', 'cancelled', 'past_due')),
  trial_ends_at TIMESTAMPTZ,
  billing_cycle TEXT DEFAULT 'monthly' CHECK (billing_cycle IN ('monthly', 'yearly')),
  stripe_customer_id  TEXT,
  stripe_subscription_id TEXT,
  avatar_url    TEXT,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Row Level Security: users can only see their own profile
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own profile"
  ON public.profiles FOR SELECT
  USING (auth.uid() = id);

CREATE POLICY "Users can update own profile"
  ON public.profiles FOR UPDATE
  USING (auth.uid() = id);

CREATE POLICY "Service role full access to profiles"
  ON public.profiles FOR ALL
  USING (auth.role() = 'service_role');

-- ────────────────────────────────────────────────────────────
-- 2. SHOPS (connected Shopify stores)
-- ────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.shops (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id       UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  shop_domain   TEXT NOT NULL,
  access_token  TEXT NOT NULL,
  shop_name     TEXT,
  shop_email    TEXT,
  plan          TEXT DEFAULT 'starter',
  is_active     BOOLEAN NOT NULL DEFAULT TRUE,
  last_sync_at  TIMESTAMPTZ,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(user_id, shop_domain)
);

ALTER TABLE public.shops ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own shops"
  ON public.shops FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can manage own shops"
  ON public.shops FOR ALL
  USING (auth.uid() = user_id);

CREATE POLICY "Service role full access to shops"
  ON public.shops FOR ALL
  USING (auth.role() = 'service_role');

-- ────────────────────────────────────────────────────────────
-- 3. AI CREDITS (track AI task usage per user)
-- ────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.ai_credits (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  used        INTEGER NOT NULL DEFAULT 0,
  limit_total INTEGER NOT NULL DEFAULT 50,
  reset_at    TIMESTAMPTZ NOT NULL DEFAULT (DATE_TRUNC('month', NOW()) + INTERVAL '1 month'),
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(user_id)
);

ALTER TABLE public.ai_credits ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own credits"
  ON public.ai_credits FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Service role full access to credits"
  ON public.ai_credits FOR ALL
  USING (auth.role() = 'service_role');

-- ────────────────────────────────────────────────────────────
-- 4. IMPORT HISTORY (track imported products per user)
-- ────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.import_history (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id       UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  shop_id       UUID REFERENCES public.shops(id) ON DELETE SET NULL,
  source_url    TEXT,
  product_title TEXT NOT NULL,
  shopify_id    TEXT,
  supplier_price DECIMAL(10,2),
  selling_price  DECIMAL(10,2),
  status        TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'imported', 'failed')),
  error_message TEXT,
  imported_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE public.import_history ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own import history"
  ON public.import_history FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Service role full access to import history"
  ON public.import_history FOR ALL
  USING (auth.role() = 'service_role');

-- ────────────────────────────────────────────────────────────
-- 5. ACTION HISTORY (track all product modifications)
-- ────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.action_history (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  shop_id     UUID REFERENCES public.shops(id) ON DELETE SET NULL,
  action_type TEXT NOT NULL CHECK (action_type IN ('price_update', 'title_update', 'description_update', 'tags_update', 'status_update', 'ai_generation', 'bulk_import', 'image_processing')),
  products_affected INTEGER NOT NULL DEFAULT 1,
  details     JSONB,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE public.action_history ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own history"
  ON public.action_history FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Service role full access to history"
  ON public.action_history FOR ALL
  USING (auth.role() = 'service_role');

-- ────────────────────────────────────────────────────────────
-- 6. AUTOMATION RULES (persistent automation configuration)
-- ────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.automation_rules (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  shop_id     UUID REFERENCES public.shops(id) ON DELETE CASCADE,
  name        TEXT NOT NULL,
  trigger     TEXT NOT NULL CHECK (trigger IN ('daily', 'weekly', 'price_change', 'new_product', 'manual')),
  action_type TEXT NOT NULL CHECK (action_type IN ('price_adjust', 'ai_optimize', 'notify', 'export')),
  config      JSONB NOT NULL DEFAULT '{}',
  is_active   BOOLEAN NOT NULL DEFAULT TRUE,
  last_run_at TIMESTAMPTZ,
  run_count   INTEGER NOT NULL DEFAULT 0,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE public.automation_rules ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage own automation rules"
  ON public.automation_rules FOR ALL
  USING (auth.uid() = user_id);

CREATE POLICY "Service role full access to automation rules"
  ON public.automation_rules FOR ALL
  USING (auth.role() = 'service_role');

-- ────────────────────────────────────────────────────────────
-- 7. TRIGGERS — Auto-update updated_at columns
-- ────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_profiles_updated_at
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_shops_updated_at
  BEFORE UPDATE ON public.shops
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_automation_rules_updated_at
  BEFORE UPDATE ON public.automation_rules
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ────────────────────────────────────────────────────────────
-- 8. FUNCTION — Auto-create profile on signup
-- ────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, email, first_name, plan, plan_status, trial_ends_at)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'first_name', ''),
    COALESCE(NEW.raw_user_meta_data->>'plan', 'starter'),
    'trial',
    NOW() + INTERVAL '7 days'
  );

  INSERT INTO public.ai_credits (user_id, used, limit_total)
  VALUES (
    NEW.id,
    0,
    CASE COALESCE(NEW.raw_user_meta_data->>'plan', 'starter')
      WHEN 'starter' THEN 50
      WHEN 'pro'     THEN 300
      WHEN 'scale'   THEN 1000
      ELSE 50
    END
  );

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger: create profile automatically when user signs up
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- ────────────────────────────────────────────────────────────
-- 9. INDEXES for performance
-- ────────────────────────────────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_shops_user_id ON public.shops(user_id);
CREATE INDEX IF NOT EXISTS idx_import_history_user_id ON public.import_history(user_id);
CREATE INDEX IF NOT EXISTS idx_action_history_user_id ON public.action_history(user_id);
CREATE INDEX IF NOT EXISTS idx_action_history_created_at ON public.action_history(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_automation_rules_user_id ON public.automation_rules(user_id);

-- ════════════════════════════════════════════════════════════
-- NOTE: Run this script in your Supabase SQL Editor at:
-- https://supabase.com/dashboard/project/YOUR_PROJECT/sql
-- ════════════════════════════════════════════════════════════
