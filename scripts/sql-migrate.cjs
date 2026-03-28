const https = require('https')
const sql = `ALTER TABLE IF EXISTS users ADD COLUMN IF NOT EXISTS onboarding_completed BOOLEAN DEFAULT false;
ALTER TABLE IF EXISTS users ALTER COLUMN actions_limit SET DEFAULT 100;
UPDATE users SET actions_limit = 100 WHERE plan = 'free' AND (actions_limit IS NULL OR actions_limit <= 50);`
const body = JSON.stringify({ query: sql })
const req = https.request({
  hostname: 'api.supabase.com',
  path: '/v1/projects/mhroujagzclmdlfpiqju/database/query',
  method: 'POST',
  headers: {
    Authorization: 'Bearer sbp_7aedc79d4e53e0aa12912c79993ee2c4e2fc025d',
    'Content-Type': 'application/json',
    'Content-Length': Buffer.byteLength(body)
  }
}, r => {
  let d = ''
  r.on('data', c => d += c)
  r.on('end', () => console.log('SQL result:', r.statusCode, d.slice(0, 500)))
})
req.on('error', e => console.log('ERR', e.message))
req.end(body)
