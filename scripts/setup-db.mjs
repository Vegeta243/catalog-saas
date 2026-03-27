import https from 'https'

const sql = `
CREATE TABLE IF NOT EXISTS automation_rules (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  condition_type TEXT NOT NULL DEFAULT 'stock_low',
  condition_value TEXT DEFAULT '5',
  action_type TEXT NOT NULL DEFAULT 'price_increase',
  action_value TEXT DEFAULT '10',
  enabled BOOLEAN DEFAULT true,
  last_run TIMESTAMPTZ,
  run_count INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE TABLE IF NOT EXISTS calendar_events (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT DEFAULT '',
  event_type TEXT NOT NULL DEFAULT 'custom',
  scheduled_at TIMESTAMPTZ NOT NULL,
  completed_at TIMESTAMPTZ,
  status TEXT DEFAULT 'pending',
  product_ids TEXT[] DEFAULT '{}',
  action_params JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
ALTER TABLE automation_rules ENABLE ROW LEVEL SECURITY;
ALTER TABLE calendar_events ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS automat_rls ON automation_rules;
CREATE POLICY automat_rls ON automation_rules FOR ALL USING (auth.uid()=user_id);
DROP POLICY IF EXISTS cal_rls ON calendar_events;
CREATE POLICY cal_rls ON calendar_events FOR ALL USING (auth.uid()=user_id);
`

const body = JSON.stringify({ query: sql })
const req = https.request({
  hostname: 'api.supabase.com',
  path: '/v1/projects/mhroujagzclmdlfpiqju/database/query',
  method: 'POST',
  headers: {
    'Authorization': 'Bearer sbp_7aedc79d4e53e0aa12912c79993ee2c4e2fc025d',
    'Content-Type': 'application/json',
    'Content-Length': Buffer.byteLength(body)
  }
}, res => {
  let d = ''
  res.on('data', c => d += c)
  res.on('end', () => {
    console.log('Status:', res.statusCode)
    console.log('Response:', d.slice(0, 500))
  })
})
req.on('error', e => console.error('Error:', e.message))
req.write(body)
req.end()
