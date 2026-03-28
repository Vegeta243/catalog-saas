const https = require('https')

// 1. Add onboarding_completed column
const sql = `
ALTER TABLE IF EXISTS users
  ADD COLUMN IF NOT EXISTS onboarding_completed BOOLEAN DEFAULT false;
`
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
  r.on('end', () => console.log('Onboarding column:', r.statusCode, d.slice(0, 200)))
})
req.on('error', e => console.log('ERR:', e.message))
req.end(body)

// 2. Update free users actions_limit to 100
const sql2 = `
ALTER TABLE IF EXISTS users
  ALTER COLUMN actions_limit SET DEFAULT 100;
UPDATE users SET actions_limit = 100
  WHERE plan = 'free' AND (actions_limit IS NULL OR actions_limit <= 50);
`
const body2 = JSON.stringify({ query: sql2 })
setTimeout(() => {
  const req2 = https.request({
    hostname: 'api.supabase.com',
    path: '/v1/projects/mhroujagzclmdlfpiqju/database/query',
    method: 'POST',
    headers: {
      Authorization: 'Bearer sbp_7aedc79d4e53e0aa12912c79993ee2c4e2fc025d',
      'Content-Type': 'application/json',
      'Content-Length': Buffer.byteLength(body2)
    }
  }, r => {
    let d = ''
    r.on('data', c => d += c)
    r.on('end', () => console.log('DB actions_limit update:', r.statusCode, d.slice(0, 200)))
  })
  req2.on('error', e => console.log('ERR:', e.message))
  req2.end(body2)
}, 1000)
