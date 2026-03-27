import https from 'https'

const SUPABASE_URL = 'https://mhroujagzclmdlfpiqju.supabase.co'
const SERVICE_ROLE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im1ocm91amFnemNsbWRsZnBpcWp1Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3MjEzMDc3MSwiZXhwIjoyMDg3NzA2NzcxfQ.40R_n_gu0HH4m3cO7vcm2kjPJ_F50Fu9kUf7RDCv1x8'

async function runSQL(sql) {
  return new Promise((resolve, reject) => {
    const body = JSON.stringify({ query: sql })
    const url = new URL(`${SUPABASE_URL}/rest/v1/rpc/exec_sql`)
    // Use the postgres REST endpoint
    const body2 = JSON.stringify(sql)
    const opts = {
      hostname: 'mhroujagzclmdlfpiqju.supabase.co',
      path: '/rest/v1/rpc/exec_sql',
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${SERVICE_ROLE_KEY}`,
        'apikey': SERVICE_ROLE_KEY,
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(body2)
      }
    }
    const req = https.request(opts, r => {
      let d = ''
      r.on('data', c => d += c)
      r.on('end', () => { console.log(r.statusCode, d.slice(0, 200)); resolve(d) })
    })
    req.on('error', reject)
    req.write(body2)
    req.end()
  })
}

// Check if tables exist
const checkSQL = `
SELECT table_name FROM information_schema.tables 
WHERE table_schema='public' 
AND table_name IN ('automation_rules','calendar_events','competitor_snapshots')
ORDER BY table_name;
`

async function checkTables() {
  return new Promise((resolve, reject) => {
    const body = JSON.stringify({ query: checkSQL })
    const opts = {
      hostname: 'mhroujagzclmdlfpiqju.supabase.co', 
      path: '/pg/query',
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${SERVICE_ROLE_KEY}`,
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(body)
      }
    }
    const req = https.request(opts, r => {
      let d = ''
      r.on('data', c => d += c)
      r.on('end', () => { console.log('Check tables:', r.statusCode, d.slice(0, 500)); resolve(d) })
    })
    req.on('error', reject)
    req.write(body)
    req.end()
  })
}

checkTables()
