const sql = `
CREATE TABLE IF NOT EXISTS automations (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  type TEXT NOT NULL DEFAULT 'seo',
  config JSONB DEFAULT '{}'::jsonb,
  is_active BOOLEAN DEFAULT true,
  last_run_at TIMESTAMPTZ,
  run_count INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_auto_uid ON automations(user_id);
ALTER TABLE automations ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS auto_policy ON automations;
CREATE POLICY auto_policy ON automations
  FOR ALL USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);
`;

fetch('https://mhroujagzclmdlfpiqju.supabase.co/rest/v1/rpc/exec_sql', {
  method: 'POST',
  headers: {
    'Authorization': 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im1ocm91amFnemNsbWRsZnBpcWp1Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3MjEzMDc3MSwiZXhwIjoyMDg3NzA2NzcxfQ.40R_n_gu0HH4m3cO7vcm2kjPJ_F50Fu9kUf7RDCv1x8',
    'apikey': 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im1ocm91amFnemNsbWRsZnBpcWp1Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3MjEzMDc3MSwiZXhwIjoyMDg3NzA2NzcxfQ.40R_n_gu0HH4m3cO7vcm2kjPJ_F50Fu9kUf7RDCv1x8',
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({ query: sql })
})
  .then(r => r.json())
  .then(d => console.log(JSON.stringify(d, null, 2)))
  .catch(e => console.error(e.message));
