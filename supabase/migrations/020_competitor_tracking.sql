-- Migration 020: competitor_price_history and competitor_alerts tables

-- Price history for tracking competitor product prices over time
CREATE TABLE IF NOT EXISTS competitor_price_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  competitor_id UUID NOT NULL,
  product_name TEXT NOT NULL,
  price DECIMAL(10,2) NOT NULL,
  currency TEXT DEFAULT 'EUR',
  recorded_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS competitor_price_history_user_id_idx ON competitor_price_history(user_id);
CREATE INDEX IF NOT EXISTS competitor_price_history_competitor_id_idx ON competitor_price_history(competitor_id);
CREATE INDEX IF NOT EXISTS competitor_price_history_recorded_at_idx ON competitor_price_history(recorded_at);

ALTER TABLE competitor_price_history ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "user_own_price_history" ON competitor_price_history;
CREATE POLICY "user_own_price_history" ON competitor_price_history
  FOR ALL USING (user_id = auth.uid());

-- Alert settings for competitor monitoring
CREATE TABLE IF NOT EXISTS competitor_alerts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  competitor_id UUID,
  alert_type TEXT NOT NULL CHECK (alert_type IN ('price_drop', 'price_increase', 'new_product', 'out_of_stock', 'seo_change')),
  threshold_value DECIMAL(10,2),
  frequency TEXT DEFAULT 'daily' CHECK (frequency IN ('immediate', 'daily', 'weekly')),
  notification_method TEXT DEFAULT 'email' CHECK (notification_method IN ('email', 'dashboard', 'both')),
  is_active BOOLEAN DEFAULT true,
  last_triggered TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS competitor_alerts_user_id_idx ON competitor_alerts(user_id);

ALTER TABLE competitor_alerts ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "user_own_alerts" ON competitor_alerts;
CREATE POLICY "user_own_alerts" ON competitor_alerts
  FOR ALL USING (user_id = auth.uid());
