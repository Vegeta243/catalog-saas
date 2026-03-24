const sql = `
CREATE TABLE IF NOT EXISTS competitor_price_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  competitor_id UUID NOT NULL,
  product_name TEXT NOT NULL,
  price DECIMAL(10,2) NOT NULL,
  currency TEXT DEFAULT 'EUR',
  recorded_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS cph_user_idx ON competitor_price_history(user_id);
CREATE INDEX IF NOT EXISTS cph_comp_idx ON competitor_price_history(competitor_id);
ALTER TABLE competitor_price_history ENABLE ROW LEVEL SECURITY;
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='competitor_price_history' AND policyname='user_own_price_history') THEN
    CREATE POLICY user_own_price_history ON competitor_price_history FOR ALL USING (user_id = auth.uid());
  END IF;
END $$;
CREATE TABLE IF NOT EXISTS competitor_alerts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  competitor_id UUID,
  alert_type TEXT NOT NULL,
  threshold_value DECIMAL(10,2),
  frequency TEXT DEFAULT 'daily',
  notification_method TEXT DEFAULT 'email',
  is_active BOOLEAN DEFAULT true,
  last_triggered TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS ca_user_idx ON competitor_alerts(user_id);
ALTER TABLE competitor_alerts ENABLE ROW LEVEL SECURITY;
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='competitor_alerts' AND policyname='user_own_alerts') THEN
    CREATE POLICY user_own_alerts ON competitor_alerts FOR ALL USING (user_id = auth.uid());
  END IF;
END $$;
`;

fetch('https://api.supabase.com/v1/projects/mhroujagzclmdlfpiqju/database/query', {
  method: 'POST',
  headers: {
    'Authorization': 'Bearer sbp_7aedc79d4e53e0aa12912c79993ee2c4e2fc025d',
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({ query: sql })
}).then(r => r.text()).then(t => console.log('Result:', t)).catch(e => console.error('Error:', e));
