-- Migration 009: Profit settings + product costs tables

CREATE TABLE IF NOT EXISTS user_profit_settings (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE UNIQUE,
  shopify_plan_monthly DECIMAL DEFAULT 32,
  shopify_transaction_fee_pct DECIMAL DEFAULT 0.5,
  payment_processing_fee_pct DECIMAL DEFAULT 1.4,
  payment_processing_fixed DECIMAL DEFAULT 0.25,
  avg_ad_spend_pct DECIMAL DEFAULT 15,
  avg_shipping_cost DECIMAL DEFAULT 5,
  avg_return_rate_pct DECIMAL DEFAULT 3,
  avg_return_cost DECIMAL DEFAULT 8,
  vat_rate_pct DECIMAL DEFAULT 20,
  income_tax_rate_pct DECIMAL DEFAULT 15,
  ecompilot_monthly DECIMAL DEFAULT 29,
  other_tools_monthly DECIMAL DEFAULT 0,
  monthly_fixed_costs DECIMAL DEFAULT 0,
  avg_orders_per_month INTEGER DEFAULT 100,
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS product_costs (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  shopify_product_id TEXT NOT NULL,
  product_title TEXT,
  cost_price DECIMAL DEFAULT 0,
  notes TEXT,
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, shopify_product_id)
);

ALTER TABLE user_profit_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE product_costs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users own profit settings" ON user_profit_settings FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "Users own product costs" ON product_costs FOR ALL USING (auth.uid() = user_id);
