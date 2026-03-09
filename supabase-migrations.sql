-- Run this SQL in your Supabase SQL editor to create the required tables

-- Calendar events table
CREATE TABLE IF NOT EXISTS calendar_events (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  event_type TEXT NOT NULL,
  scheduled_at TIMESTAMPTZ NOT NULL,
  completed_at TIMESTAMPTZ,
  status TEXT DEFAULT 'pending',
  product_ids JSONB DEFAULT '[]',
  action_params JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW()
);
ALTER TABLE calendar_events ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users own events" ON calendar_events FOR ALL USING (auth.uid() = user_id);

-- Competitors table
CREATE TABLE IF NOT EXISTS competitors (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  url TEXT NOT NULL,
  shop_platform TEXT,
  last_analyzed_at TIMESTAMPTZ,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
ALTER TABLE competitors ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users own competitors" ON competitors FOR ALL USING (auth.uid() = user_id);

-- Competitor snapshots table
CREATE TABLE IF NOT EXISTS competitor_snapshots (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  competitor_id UUID REFERENCES competitors(id) ON DELETE CASCADE,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  products_found INTEGER DEFAULT 0,
  avg_price DECIMAL(10,2),
  price_changes JSONB DEFAULT '[]',
  new_products JSONB DEFAULT '[]',
  removed_products JSONB DEFAULT '[]',
  raw_data JSONB DEFAULT '{}',
  acknowledged BOOLEAN DEFAULT false,
  analyzed_at TIMESTAMPTZ DEFAULT NOW()
);
ALTER TABLE competitor_snapshots ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users own snapshots" ON competitor_snapshots FOR ALL USING (auth.uid() = user_id);

-- Soft delete columns on users table (if not already added)
ALTER TABLE users ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ;
ALTER TABLE users ADD COLUMN IF NOT EXISTS deletion_scheduled_at TIMESTAMPTZ;
