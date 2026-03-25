import https from 'https'

const PAT = 'sbp_7aedc79d4e53e0aa12912c79993ee2c4e2fc025d'
const PROJECT = 'mhroujagzclmdlfpiqju'

const sql = `
CREATE TABLE IF NOT EXISTS import_jobs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  workspace_id UUID,
  platform TEXT NOT NULL,
  source_urls TEXT[] NOT NULL DEFAULT '{}',
  status TEXT NOT NULL DEFAULT 'pending',
  total_products INTEGER DEFAULT 0,
  imported_count INTEGER DEFAULT 0,
  failed_count INTEGER DEFAULT 0,
  error_message TEXT,
  results JSONB DEFAULT '[]',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS import_jobs_user_idx ON import_jobs(user_id);
CREATE INDEX IF NOT EXISTS import_jobs_status_idx ON import_jobs(status);
ALTER TABLE import_jobs ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS user_own_imports ON import_jobs;
CREATE POLICY user_own_imports ON import_jobs FOR ALL USING (user_id = auth.uid());
`

const body = JSON.stringify({ query: sql })

const req = https.request({
  hostname: 'api.supabase.com',
  path: '/v1/projects/' + PROJECT + '/database/query',
  method: 'POST',
  headers: {
    Authorization: 'Bearer ' + PAT,
    'Content-Type': 'application/json',
    'Content-Length': Buffer.byteLength(body)
  }
}, res => {
  let d = ''
  res.on('data', c => d += c)
  res.on('end', () => {
    const ok = res.statusCode < 300
    console.log(ok ? '✅ DB migration OK' : '❌ DB migration FAILED', 'HTTP', res.statusCode)
    console.log(d.slice(0, 300))
  })
})
req.write(body)
req.end()
