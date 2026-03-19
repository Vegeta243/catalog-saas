-- ─────────────────────────────────────────────────────────────────────────────
-- Migration 015: Feature flags, system config, chatbot logs
-- ─────────────────────────────────────────────────────────────────────────────

-- ── Feature flags ─────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS feature_flags (
  id             BIGSERIAL    PRIMARY KEY,
  key            TEXT         NOT NULL UNIQUE,
  name           TEXT         NOT NULL,
  description    TEXT         DEFAULT '',
  enabled        BOOLEAN      NOT NULL DEFAULT false,
  visible_plans  TEXT[]       DEFAULT ARRAY['free','starter','pro','scale'],
  badge          TEXT         DEFAULT NULL,   -- e.g. 'BETA', 'NEW', 'SOON'
  admin_preview  BOOLEAN      NOT NULL DEFAULT false,
  created_at     TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
  updated_at     TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS feature_flags_key_idx ON feature_flags (key);

ALTER TABLE feature_flags ENABLE ROW LEVEL SECURITY;
-- Public read for authenticated users (so client-side hooks can query)
CREATE POLICY "authenticated read feature flags" ON feature_flags
  FOR SELECT USING (auth.role() = 'authenticated');
-- Write: service role only
CREATE POLICY "service role write feature flags" ON feature_flags
  FOR ALL USING (auth.role() = 'service_role');

-- Seed initial flags
INSERT INTO feature_flags (key, name, description, enabled, visible_plans, badge) VALUES
  ('ai_product_search',    'Recherche IA produits',      'Recherche de produits gagnants par IA',           true,  ARRAY['pro','scale'],          'BETA'),
  ('ai_store_design',      'Design IA boutique',         'Personnalisation du thème Shopify par IA',        true,  ARRAY['pro','scale'],          'NEW'),
  ('ai_descriptions',      'Descriptions IA',            'Génération de descriptions produit',              true,  ARRAY['starter','pro','scale'], NULL),
  ('ai_chatbot',           'Assistant IA',               'Chatbot intégré dans le dashboard',               true,  ARRAY['free','starter','pro','scale'], NULL),
  ('calendar_ai',          'Calendrier contenu IA',      'Planification de contenu automatique',            true,  ARRAY['pro','scale'],          NULL),
  ('bulk_edit',            'Édition en masse',           'Modifier plusieurs produits à la fois',           true,  ARRAY['starter','pro','scale'], NULL),
  ('product_import',       'Import AliExpress/CJ',       'Import de produits depuis AliExpress et CJ',      true,  ARRAY['free','starter','pro','scale'], NULL),
  ('referral_program',     'Programme parrainage',       'Système de parrainage avec réductions',           true,  ARRAY['free','starter','pro','scale'], NULL),
  ('shopify_sync',         'Sync Shopify temps réel',    'Synchronisation live avec Shopify',               false, ARRAY['scale'],                'SOON'),
  ('analytics_advanced',   'Analytics avancés',          'Tableaux de bord avancés avec prédictions',       false, ARRAY['scale'],                'SOON'),
  ('multi_shop',           'Multi-boutiques',            'Gérer plusieurs boutiques Shopify',               true,  ARRAY['pro','scale'],          NULL),
  ('email_broadcast',      'Emails broadcast',           'Envoi d''emails marketing en masse',              false, ARRAY['scale'],                'SOON')
ON CONFLICT (key) DO NOTHING;

-- ── System configuration ───────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS system_config (
  id          BIGSERIAL    PRIMARY KEY,
  key         TEXT         NOT NULL UNIQUE,
  value       JSONB        NOT NULL DEFAULT '{}'::jsonb,
  description TEXT         DEFAULT '',
  updated_at  TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
  updated_by  TEXT         DEFAULT NULL
);

CREATE INDEX IF NOT EXISTS system_config_key_idx ON system_config (key);

ALTER TABLE system_config ENABLE ROW LEVEL SECURITY;
-- No public access — admin only via service role
CREATE POLICY "service role only system config" ON system_config
  FOR ALL USING (auth.role() = 'service_role');

-- Seed initial system config
INSERT INTO system_config (key, value, description) VALUES
  ('maintenance_mode',     '{"enabled": false, "message": "Maintenance en cours, revenez bientôt."}', 'Activer/désactiver le mode maintenance'),
  ('announcement_banner',  '{"enabled": false, "text": "", "color": "blue", "link": "", "link_text": ""}', 'Bannière d''annonce globale'),
  ('plan_limits',          '{"free": 30, "starter": 1000, "pro": 20000, "scale": 100000}', 'Limites de tâches IA par plan'),
  ('global_settings',      '{"app_name": "CatalogSaaS", "support_email": "support@catalogsaas.com", "max_referral_discount": 60, "referral_discount_per": 20}', 'Paramètres globaux de l''application'),
  ('stripe_webhooks',      '{"endpoint_secret": "", "live_mode": false}', 'Configuration Stripe'),
  ('openai_settings',      '{"model": "gpt-4o-mini", "max_tokens_per_request": 2000, "monthly_budget_eur": 50}', 'Paramètres OpenAI')
ON CONFLICT (key) DO NOTHING;

-- ── Chatbot logs ───────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS chatbot_logs (
  id                   BIGSERIAL    PRIMARY KEY,
  user_id              UUID         NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  session_id           TEXT         NOT NULL DEFAULT gen_random_uuid()::text,
  messages             JSONB        NOT NULL DEFAULT '[]'::jsonb,  -- array of {role, content, ts}
  unanswered_question  TEXT         DEFAULT NULL,
  intent               TEXT         DEFAULT NULL,
  resolved             BOOLEAN      DEFAULT false,
  created_at           TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
  updated_at           TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS chatbot_logs_user_id_idx    ON chatbot_logs (user_id);
CREATE INDEX IF NOT EXISTS chatbot_logs_created_at_idx ON chatbot_logs (created_at DESC);
CREATE INDEX IF NOT EXISTS chatbot_logs_unresolved_idx ON chatbot_logs (resolved) WHERE resolved = false;

ALTER TABLE chatbot_logs ENABLE ROW LEVEL SECURITY;
-- Users can read/write their own logs
CREATE POLICY "users own chatbot logs" ON chatbot_logs
  FOR ALL USING (auth.uid() = user_id);
-- Service role full access
CREATE POLICY "service role chatbot logs" ON chatbot_logs
  FOR ALL USING (auth.role() = 'service_role');

-- ── Chatbot intents ────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS chatbot_intents (
  id          BIGSERIAL    PRIMARY KEY,
  name        TEXT         NOT NULL UNIQUE,
  keywords    TEXT[]       NOT NULL DEFAULT '{}',
  response    TEXT         NOT NULL DEFAULT '',
  enabled     BOOLEAN      NOT NULL DEFAULT true,
  created_at  TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
  updated_at  TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);

ALTER TABLE chatbot_intents ENABLE ROW LEVEL SECURITY;
CREATE POLICY "service role chatbot intents" ON chatbot_intents
  FOR ALL USING (auth.role() = 'service_role');

-- Seed intents
INSERT INTO chatbot_intents (name, keywords, response) VALUES
  ('import_help',   ARRAY['importer','import','produit','aliexpress'],
   'Pour importer un produit AliExpress, allez dans le menu "Importer" et collez l''URL du produit. L''IA extrait automatiquement titre, images et prix.'),
  ('billing_help',  ARRAY['facture','paiement','abonnement','forfait','prix'],
   'Pour gérer votre abonnement : Tableau de bord → Crédits & Plans. Vous pouvez changer, suspendre ou annuler à tout moment.'),
  ('shopify_connect', ARRAY['shopify','boutique','connecter','shop'],
   'Pour connecter Shopify : Tableau de bord → Mes Boutiques → Ajouter une boutique. Vous aurez besoin des URL et token Admin Shopify.')
ON CONFLICT (name) DO NOTHING;

-- ── Trigger: update updated_at on changes ─────────────────────────────────────
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;

DO $$ BEGIN
  CREATE TRIGGER feature_flags_updated_at BEFORE UPDATE ON feature_flags FOR EACH ROW EXECUTE FUNCTION update_updated_at();
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TRIGGER system_config_updated_at BEFORE UPDATE ON system_config FOR EACH ROW EXECUTE FUNCTION update_updated_at();
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TRIGGER chatbot_logs_updated_at BEFORE UPDATE ON chatbot_logs FOR EACH ROW EXECUTE FUNCTION update_updated_at();
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
