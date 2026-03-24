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
  // Check for specific tables
  const tables = await runQuery(
    "SELECT table_name FROM information_schema.tables WHERE table_schema='public' AND table_name IN ('blocked_email_domains','signup_attempts') ORDER BY 1"
  )
  console.log('=== Existing tables ===')
  console.log(JSON.stringify(tables, null, 2))

  // If missing, create them
  const existing = Array.isArray(tables) ? tables.map(t => t.table_name) : []
  
  if (!existing.includes('blocked_email_domains')) {
    console.log('\nCreating blocked_email_domains...')
    const r = await runQuery(`
      CREATE TABLE IF NOT EXISTS blocked_email_domains (
        id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
        domain text NOT NULL UNIQUE,
        created_at timestamptz DEFAULT now()
      );
      ALTER TABLE blocked_email_domains ENABLE ROW LEVEL SECURITY;
      CREATE POLICY "Admin read blocked domains" ON blocked_email_domains FOR SELECT USING (true);
      INSERT INTO blocked_email_domains (domain) VALUES
        ('yopmail.com'),('tempmail.com'),('guerrillamail.com'),('mailinator.com'),
        ('throwaway.email'),('temp-mail.org'),('fakeinbox.com'),('sharklasers.com'),
        ('guerrillamailblock.com'),('grr.la'),('10minutemail.com'),('trashmail.com'),
        ('mohmal.com'),('dispostable.com'),('maildrop.cc')
      ON CONFLICT (domain) DO NOTHING;
    `)
    console.log(JSON.stringify(r))
  }
  
  if (!existing.includes('signup_attempts')) {
    console.log('\nCreating signup_attempts...')
    const r = await runQuery(`
      CREATE TABLE IF NOT EXISTS signup_attempts (
        id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
        ip_address text NOT NULL,
        email text,
        created_at timestamptz DEFAULT now()
      );
      ALTER TABLE signup_attempts ENABLE ROW LEVEL SECURITY;
      CREATE INDEX IF NOT EXISTS idx_signup_attempts_ip ON signup_attempts (ip_address, created_at);
    `)
    console.log(JSON.stringify(r))
  }

  console.log('\nDone.')
}

main().catch(console.error)
