const https = require('https')

function runQuery(sql) {
  return new Promise((resolve, reject) => {
    const body = JSON.stringify({ query: sql })
    const req = https.request({
      hostname: 'api.supabase.com',
      path: '/v1/projects/mhroujagzclmdlfpiqju/database/query',
      method: 'POST',
      headers: {
        'Authorization': 'Bearer sbp_7aedc79d4e53e0aa12912c79993ee2c4e2fc025d',
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(body),
      }
    }, res => {
      let d = ''
      res.on('data', c => d += c)
      res.on('end', () => {
        try { resolve(JSON.parse(d)) } catch(e) { resolve(d) }
      })
    })
    req.on('error', reject)
    req.write(body)
    req.end()
  })
}

async function main() {
  // Verify tables
  const tables = await runQuery(
    "SELECT table_name FROM information_schema.tables WHERE table_schema='public' AND table_name IN ('blocked_email_domains','signup_attempts') ORDER BY 1"
  )
  console.log('Tables:', JSON.stringify(tables))

  // Check blocked domains count
  const domains = await runQuery("SELECT count(*) as cnt FROM blocked_email_domains")
  console.log('Blocked domains count:', JSON.stringify(domains))

  // Count total tables
  const total = await runQuery("SELECT count(*) as cnt FROM information_schema.tables WHERE table_schema='public'")
  console.log('Total public tables:', JSON.stringify(total))
}
main().catch(console.error)
