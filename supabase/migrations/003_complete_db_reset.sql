-- ════════════════════════════════════════════════════════════════
-- Migration 003 : Reset complet de la base de données
-- Crée toutes les tables nécessaires pour les clients EcomPilot
-- Exécuter dans Supabase SQL Editor
-- ════════════════════════════════════════════════════════════════

-- ────────────────────────────────────────────────────────────
-- 0. NETTOYAGE — Supprimer tout ce qui existe
-- ────────────────────────────────────────────────────────────

-- Supprimer triggers et tables de façon sécurisée
DO $$ 
BEGIN
  -- Triggers sur auth.users
  DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
  
  -- Triggers sur les tables si elles existent
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'users') THEN
    DROP TRIGGER IF EXISTS set_users_updated_at ON public.users;
  END IF;
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'shops') THEN
    DROP TRIGGER IF EXISTS set_shops_updated_at ON public.shops;
    DROP TRIGGER IF EXISTS update_shops_updated_at ON public.shops;
  END IF;
END $$;

-- Supprimer les tables (CASCADE gère les dépendances)
DROP TABLE IF EXISTS public.automation_rules CASCADE;
DROP TABLE IF EXISTS public.action_history CASCADE;
DROP TABLE IF EXISTS public.import_history CASCADE;
DROP TABLE IF EXISTS public.ai_credits CASCADE;
DROP TABLE IF EXISTS public.shops CASCADE;
DROP TABLE IF EXISTS public.users CASCADE;

-- Supprimer les anciennes fonctions
DROP FUNCTION IF EXISTS public.handle_new_user() CASCADE;
DROP FUNCTION IF EXISTS public.update_updated_at_column() CASCADE;
DROP FUNCTION IF EXISTS public.increment_actions(UUID, INTEGER) CASCADE;
DROP FUNCTION IF EXISTS public.reset_monthly_actions() CASCADE;

-- ────────────────────────────────────────────────────────────
-- 1. TABLE USERS — Données client
-- ────────────────────────────────────────────────────────────
CREATE TABLE public.users (
  id                      UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email                   TEXT NOT NULL,
  first_name              TEXT,
  last_name               TEXT,
  avatar_url              TEXT,
  phone                   TEXT,
  
  -- Abonnement et facturation
  plan                    TEXT NOT NULL DEFAULT 'free' 
                          CHECK (plan IN ('free', 'starter', 'pro', 'scale')),
  subscription_status     TEXT DEFAULT 'inactive'
                          CHECK (subscription_status IN ('inactive', 'active', 'trialing', 'past_due', 'canceled', 'incomplete')),
  stripe_customer_id      TEXT UNIQUE,
  stripe_subscription_id  TEXT UNIQUE,
  current_period_end      TIMESTAMPTZ,
  
  -- Suivi d'utilisation
  actions_used            INTEGER NOT NULL DEFAULT 0,
  actions_limit           INTEGER NOT NULL DEFAULT 50,
  actions_reset_at        TIMESTAMPTZ DEFAULT (DATE_TRUNC('month', NOW()) + INTERVAL '1 month'),
  
  -- Préférences
  timezone                TEXT DEFAULT 'Europe/Paris',
  locale                  TEXT DEFAULT 'fr',
  
  -- Notifications
  notif_email             BOOLEAN NOT NULL DEFAULT TRUE,
  notif_stock_alert       BOOLEAN NOT NULL DEFAULT TRUE,
  notif_price_alert       BOOLEAN NOT NULL DEFAULT FALSE,
  notif_weekly_report     BOOLEAN NOT NULL DEFAULT TRUE,
  notif_security          BOOLEAN NOT NULL DEFAULT TRUE,
  
  -- Timestamps
  last_login_at           TIMESTAMPTZ,
  created_at              TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at              TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Index
CREATE UNIQUE INDEX users_email_idx ON public.users(email);
CREATE INDEX users_stripe_customer_idx ON public.users(stripe_customer_id);
CREATE INDEX users_plan_idx ON public.users(plan);

-- RLS
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;

CREATE POLICY "users_select_own" ON public.users
  FOR SELECT USING (auth.uid() = id);

CREATE POLICY "users_update_own" ON public.users
  FOR UPDATE USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);

CREATE POLICY "users_insert_own" ON public.users
  FOR INSERT WITH CHECK (auth.uid() = id);

CREATE POLICY "users_service_role" ON public.users
  FOR ALL USING (auth.role() = 'service_role');

-- ────────────────────────────────────────────────────────────
-- 2. TABLE SHOPS — Boutiques Shopify connectées
-- ────────────────────────────────────────────────────────────
CREATE TABLE public.shops (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id         UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  shop_domain     TEXT NOT NULL,
  shop_name       TEXT,
  access_token    TEXT,
  scopes          TEXT,
  is_active       BOOLEAN NOT NULL DEFAULT TRUE,
  uninstalled_at  TIMESTAMPTZ,
  products_count  INTEGER DEFAULT 0,
  last_sync_at    TIMESTAMPTZ,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  
  UNIQUE(user_id, shop_domain)
);

-- Index
CREATE INDEX shops_user_id_idx ON public.shops(user_id);
CREATE INDEX shops_domain_idx ON public.shops(shop_domain);

-- RLS
ALTER TABLE public.shops ENABLE ROW LEVEL SECURITY;

CREATE POLICY "shops_select_own" ON public.shops
  FOR SELECT USING (user_id = auth.uid());

CREATE POLICY "shops_insert_own" ON public.shops
  FOR INSERT WITH CHECK (user_id = auth.uid());

CREATE POLICY "shops_update_own" ON public.shops
  FOR UPDATE USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "shops_delete_own" ON public.shops
  FOR DELETE USING (user_id = auth.uid());

CREATE POLICY "shops_service_role" ON public.shops
  FOR ALL USING (auth.role() = 'service_role');

-- ────────────────────────────────────────────────────────────
-- 3. TABLE ACTION_HISTORY — Historique de toutes les actions
-- ────────────────────────────────────────────────────────────
CREATE TABLE public.action_history (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id         UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  shop_id         UUID REFERENCES public.shops(id) ON DELETE SET NULL,
  action_type     TEXT NOT NULL,
  description     TEXT,
  products_count  INTEGER NOT NULL DEFAULT 1,
  credits_used    INTEGER NOT NULL DEFAULT 1,
  details         JSONB DEFAULT '{}',
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Index
CREATE INDEX action_history_user_id_idx ON public.action_history(user_id);
CREATE INDEX action_history_created_at_idx ON public.action_history(created_at DESC);
CREATE INDEX action_history_type_idx ON public.action_history(action_type);

-- RLS
ALTER TABLE public.action_history ENABLE ROW LEVEL SECURITY;

CREATE POLICY "action_history_select_own" ON public.action_history
  FOR SELECT USING (user_id = auth.uid());

CREATE POLICY "action_history_insert_own" ON public.action_history
  FOR INSERT WITH CHECK (user_id = auth.uid());

CREATE POLICY "action_history_service_role" ON public.action_history
  FOR ALL USING (auth.role() = 'service_role');

-- ────────────────────────────────────────────────────────────
-- 4. TABLE IMPORT_HISTORY — Historique des imports produits
-- ────────────────────────────────────────────────────────────
CREATE TABLE public.import_history (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id         UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  shop_id         UUID REFERENCES public.shops(id) ON DELETE SET NULL,
  source_url      TEXT,
  product_title   TEXT NOT NULL,
  shopify_id      TEXT,
  supplier_price  DECIMAL(10,2),
  selling_price   DECIMAL(10,2),
  status          TEXT NOT NULL DEFAULT 'pending'
                  CHECK (status IN ('pending', 'imported', 'failed')),
  error_message   TEXT,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Index
CREATE INDEX import_history_user_id_idx ON public.import_history(user_id);
CREATE INDEX import_history_status_idx ON public.import_history(status);

-- RLS
ALTER TABLE public.import_history ENABLE ROW LEVEL SECURITY;

CREATE POLICY "import_history_select_own" ON public.import_history
  FOR SELECT USING (user_id = auth.uid());

CREATE POLICY "import_history_insert_own" ON public.import_history
  FOR INSERT WITH CHECK (user_id = auth.uid());

CREATE POLICY "import_history_service_role" ON public.import_history
  FOR ALL USING (auth.role() = 'service_role');

-- ────────────────────────────────────────────────────────────
-- 5. FONCTIONS UTILITAIRES
-- ────────────────────────────────────────────────────────────

-- Auto-update updated_at
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER set_users_updated_at
  BEFORE UPDATE ON public.users
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER set_shops_updated_at
  BEFORE UPDATE ON public.shops
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- ────────────────────────────────────────────────────────────
-- 6. TRIGGER — Créer automatiquement un profil utilisateur
-- ────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.users (id, email, first_name, avatar_url, plan, actions_limit)
  VALUES (
    NEW.id,
    COALESCE(NEW.email, ''),
    COALESCE(
      NEW.raw_user_meta_data->>'first_name',
      NEW.raw_user_meta_data->>'full_name',
      NEW.raw_user_meta_data->>'name',
      split_part(COALESCE(NEW.email, ''), '@', 1)
    ),
    COALESCE(
      NEW.raw_user_meta_data->>'avatar_url',
      NEW.raw_user_meta_data->>'picture',
      NULL
    ),
    'free',
    50
  )
  ON CONFLICT (id) DO UPDATE SET
    email = EXCLUDED.email,
    first_name = COALESCE(EXCLUDED.first_name, public.users.first_name),
    avatar_url = COALESCE(EXCLUDED.avatar_url, public.users.avatar_url),
    updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- ────────────────────────────────────────────────────────────
-- 7. FONCTION — Incrémenter les actions utilisées
-- ────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.increment_actions(p_user_id UUID, p_count INTEGER DEFAULT 1)
RETURNS INTEGER AS $$
DECLARE
  v_new_count INTEGER;
BEGIN
  UPDATE public.users 
  SET actions_used = actions_used + p_count,
      updated_at = NOW()
  WHERE id = p_user_id
  RETURNING actions_used INTO v_new_count;
  
  RETURN COALESCE(v_new_count, 0);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ────────────────────────────────────────────────────────────
-- 8. FONCTION — Reset mensuel des actions
-- ────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.reset_monthly_actions()
RETURNS void AS $$
BEGIN
  UPDATE public.users 
  SET actions_used = 0,
      actions_reset_at = DATE_TRUNC('month', NOW()) + INTERVAL '1 month',
      updated_at = NOW()
  WHERE actions_reset_at <= NOW();
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ────────────────────────────────────────────────────────────
-- 9. RE-CRÉER les profils pour les utilisateurs existants
-- ────────────────────────────────────────────────────────────
INSERT INTO public.users (id, email, first_name, avatar_url, plan, actions_limit)
SELECT 
  au.id,
  COALESCE(au.email, ''),
  COALESCE(
    au.raw_user_meta_data->>'first_name',
    au.raw_user_meta_data->>'full_name',
    au.raw_user_meta_data->>'name',
    split_part(COALESCE(au.email, ''), '@', 1)
  ),
  COALESCE(
    au.raw_user_meta_data->>'avatar_url',
    au.raw_user_meta_data->>'picture',
    NULL
  ),
  'free',
  50
FROM auth.users au
ON CONFLICT (id) DO NOTHING;

-- ════════════════════════════════════════════════════════════════
-- FIN — La base de données est prête pour EcomPilot
-- ════════════════════════════════════════════════════════════════
