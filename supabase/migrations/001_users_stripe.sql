-- ============================================================
-- Migration 001 : Table users + colonnes Stripe/abonnement
-- À exécuter dans Supabase SQL Editor
-- (Dashboard > SQL Editor > + New query > Paste > Run)
-- ============================================================

-- Table publique users liée à auth.users
CREATE TABLE IF NOT EXISTS public.users (
  id              uuid        PRIMARY KEY REFERENCES auth.users (id) ON DELETE CASCADE,
  email           text        UNIQUE,
  first_name      text,
  last_name       text,

  -- Abonnement
  plan                    text        NOT NULL DEFAULT 'free',   -- 'free' | 'starter' | 'pro' | 'scale'
  stripe_customer_id      text        UNIQUE,
  stripe_subscription_id  text        UNIQUE,
  subscription_status     text,       -- 'active' | 'trialing' | 'past_due' | 'canceled' | 'incomplete'
  current_period_end      timestamptz,

  -- Usage
  actions_used        integer     NOT NULL DEFAULT 0,
  actions_reset_at    timestamptz,

  created_at  timestamptz NOT NULL DEFAULT now(),
  updated_at  timestamptz NOT NULL DEFAULT now()
);

-- Index sur email pour les lookups webhook Stripe
CREATE INDEX IF NOT EXISTS users_email_idx ON public.users (email);

-- Index sur stripe_customer_id pour les webhooks
CREATE INDEX IF NOT EXISTS users_stripe_customer_idx ON public.users (stripe_customer_id);

-- Trigger pour updated_at automatique
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS set_users_updated_at ON public.users;
CREATE TRIGGER set_users_updated_at
  BEFORE UPDATE ON public.users
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- ============================================================
-- Row Level Security (RLS)
-- ============================================================

ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;

-- Les utilisateurs ne peuvent lire que leur propre ligne
CREATE POLICY "users_select_own" ON public.users
  FOR SELECT USING (auth.uid() = id);

-- Les utilisateurs peuvent mettre à jour leur propre ligne (sauf plan/stripe)
CREATE POLICY "users_update_own" ON public.users
  FOR UPDATE USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);

-- Le service role (webhooks Stripe, server-side) peut tout faire
-- Pas de policy nécessaire pour service_role car il bypasse RLS

-- ============================================================
-- Fonction pour créer automatiquement un profil à l'inscription
-- ============================================================

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.users (id, email, first_name)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'first_name', split_part(NEW.email, '@', 1))
  )
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- ============================================================
-- Table shops (Shopify) - si pas encore créée
-- ============================================================

CREATE TABLE IF NOT EXISTS public.shops (
  id              uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id         uuid        REFERENCES public.users (id) ON DELETE CASCADE,
  shop_domain     text        NOT NULL UNIQUE,
  shop_name       text,
  access_token    text        NOT NULL,
  is_active       boolean     NOT NULL DEFAULT true,
  scopes          text,
  shopify_user_id text,
  shopify_user_email text,
  last_sync_at    timestamptz,
  created_at      timestamptz NOT NULL DEFAULT now(),
  updated_at      timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS shops_user_id_idx ON public.shops (user_id);
CREATE INDEX IF NOT EXISTS shops_domain_idx ON public.shops (shop_domain);

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

DROP TRIGGER IF EXISTS set_shops_updated_at ON public.shops;
CREATE TRIGGER set_shops_updated_at
  BEFORE UPDATE ON public.shops
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- ============================================================
-- Commentaire final
-- ============================================================
-- Migration complète. Après exécution :
-- 1. Ajoutez STRIPE_SECRET_KEY dans .env.local
-- 2. Lancez POST /api/stripe/setup pour créer les produits Stripe
-- 3. Ajoutez les Price IDs retournés dans .env.local
-- 4. Configurez le webhook Stripe : stripe listen --forward-to localhost:3000/api/stripe/webhook
-- ============================================================
