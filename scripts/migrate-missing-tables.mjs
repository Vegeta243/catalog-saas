import https from 'https';

const PAT = 'sbp_7aedc79d4e53e0aa12912c79993ee2c4e2fc025d';
const PROJECT = 'mhroujagzclmdlfpiqju';

function apiQuery(sql) {
  return new Promise((resolve, reject) => {
    const body = JSON.stringify({ query: sql });
    const opts = {
      hostname: 'api.supabase.com',
      path: `/v1/projects/${PROJECT}/database/query`,
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${PAT}`,
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(body),
      },
    };
    const req = https.request(opts, r => {
      let d = '';
      r.on('data', c => d += c);
      r.on('end', () => {
        try { resolve(JSON.parse(d)); }
        catch { resolve(d); }
      });
    });
    req.on('error', reject);
    req.write(body);
    req.end();
  });
}

// 1. feature_flags table
const featureFlagsSQL = `
CREATE TABLE IF NOT EXISTS public.feature_flags (
  id           BIGSERIAL    PRIMARY KEY,
  key          TEXT         NOT NULL UNIQUE,
  name         TEXT         NOT NULL,
  description  TEXT         DEFAULT '',
  enabled      BOOLEAN      NOT NULL DEFAULT true,
  visible_plans TEXT[]      NOT NULL DEFAULT ARRAY['free','starter','pro','scale'],
  badge        TEXT         DEFAULT NULL,
  admin_preview BOOLEAN     DEFAULT false,
  created_at   TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
  updated_at   TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);
ALTER TABLE public.feature_flags ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "public read feature_flags" ON public.feature_flags;
DROP POLICY IF EXISTS "service write feature_flags" ON public.feature_flags;
CREATE POLICY "public read feature_flags" ON public.feature_flags
  FOR SELECT USING (true);
CREATE POLICY "service write feature_flags" ON public.feature_flags
  FOR ALL USING (auth.role() = 'service_role');
`;

// 2. Insert default feature flags
const insertFlagsSQL = `
INSERT INTO public.feature_flags (key, name, description, enabled, visible_plans, badge) VALUES
('concurrence',       'Analyse Concurrence',        'Analyse SEO et prix concurrents',  true, ARRAY['starter','pro','scale'], NULL),
('ai_generation',     'Génération IA',               'Titres et descriptions par IA',    true, ARRAY['free','starter','pro','scale'], NULL),
('import_aliexpress', 'Import AliExpress',           'Importation produits AliExpress',  true, ARRAY['free','starter','pro','scale'], NULL),
('shopify_sync',      'Sync Shopify',                'Synchronisation catalogue Shopify', true, ARRAY['starter','pro','scale'], NULL),
('automation',        'Automatisation',              'Règles automatiques',              true, ARRAY['pro','scale'], 'BETA'),
('chatbot',           'Chatbot IA',                  'Chatbot support clients IA',        true, ARRAY['pro','scale'], 'BETA'),
('referral',          'Parrainage',                  'Système de parrainage',             true, ARRAY['free','starter','pro','scale'], NULL),
('image_editor',      'Éditeur image',               'Traitement images par IA',          true, ARRAY['starter','pro','scale'], NULL),
('rentabilite',       'Calculateur rentabilité',     'Analyse de rentabilité produits',   true, ARRAY['free','starter','pro','scale'], NULL),
('calendrier',        'Calendrier éditorial',        'Planning publications',             true, ARRAY['pro','scale'], NULL)
ON CONFLICT (key) DO NOTHING;
`;

// 3. referrals table
const referralsSQL = `
CREATE TABLE IF NOT EXISTS public.referrals (
  id              UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
  referrer_id     UUID         NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  referred_email  TEXT         NOT NULL,
  referral_code   TEXT         NOT NULL,
  status          TEXT         NOT NULL DEFAULT 'pending',
  converted_at    TIMESTAMPTZ  DEFAULT NULL,
  created_at      TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS referrals_referrer_idx ON public.referrals (referrer_id);
CREATE INDEX IF NOT EXISTS referrals_code_idx ON public.referrals (referral_code);
ALTER TABLE public.referrals ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "referrals_own" ON public.referrals;
DROP POLICY IF EXISTS "referrals_service" ON public.referrals;
CREATE POLICY "referrals_own" ON public.referrals
  FOR ALL USING (auth.uid() = referrer_id);
CREATE POLICY "referrals_service" ON public.referrals
  FOR ALL USING (auth.role() = 'service_role');
`;

// 4. Add referral_code to users if missing
const addReferralCodeSQL = `
ALTER TABLE public.users 
  ADD COLUMN IF NOT EXISTS referral_code TEXT UNIQUE DEFAULT NULL;
`;

console.log('Creating feature_flags table...');
const r1 = await apiQuery(featureFlagsSQL);
console.log('Result:', JSON.stringify(r1).slice(0, 100));

console.log('Inserting default feature flags...');
const r2 = await apiQuery(insertFlagsSQL);
console.log('Result:', JSON.stringify(r2).slice(0, 100));

console.log('Creating referrals table...');
const r3 = await apiQuery(referralsSQL);
console.log('Result:', JSON.stringify(r3).slice(0, 100));

console.log('Adding referral_code column to users...');
const r4 = await apiQuery(addReferralCodeSQL);
console.log('Result:', JSON.stringify(r4).slice(0, 100));

console.log('All done!');
