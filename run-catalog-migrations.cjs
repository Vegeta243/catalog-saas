const https = require('https')
const fs = require('fs')
const path = require('path')

const PAT = 'sbp_7aedc79d4e53e0aa12912c79993ee2c4e2fc025d'
const PROJECT_REF = 'mhroujagzclmdlfpiqju'

async function runSQL(sql, label) {
  return new Promise((resolve, reject) => {
    const body = JSON.stringify({ query: sql })
    const req = https.request({
      hostname: 'api.supabase.com',
      path: `/v1/projects/${PROJECT_REF}/database/query`,
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${PAT}`,
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(body)
      }
    }, res => {
      let data = ''
      res.on('data', chunk => data += chunk)
      res.on('end', () => {
        const result = { status: res.statusCode, body: data }
        if (res.statusCode === 200 || res.statusCode === 201) {
          console.log(`✅ ${label}: SUCCESS`)
        } else {
          console.log(`❌ ${label}: FAILED (${res.statusCode})`)
          console.log('   Error:', data.slice(0, 300))
        }
        resolve(result)
      })
    })
    req.on('error', reject)
    req.write(body)
    req.end()
  })
}

async function runMigration(filename) {
  const filePath = path.join(__dirname, 'supabase', 'migrations', filename)
  
  if (!fs.existsSync(filePath)) {
    console.log(`⚠️  File not found: ${filename}`)
    return false
  }
  
  const sql = fs.readFileSync(filePath, 'utf8')
  console.log(`\n📄 Running migration: ${filename}`)
  console.log(`   SQL length: ${sql.length} characters`)
  
  try {
    const result = await runSQL(sql, filename)
    if (result.status === 200 || result.status === 201) {
      console.log(`   Result: ✅ all statements succeeded`)
      return true
    } else {
      const body = result.body.toLowerCase()
      if (body.includes('already exists') || body.includes('duplicate')) {
        console.log(`   ℹ️  Skipped (already exists — idempotent)`)
        return true
      }
      console.log(`   Result: ❌ failed`)
      return false
    }
  } catch (err) {
    console.log(`   ❌ Error: ${err.message}`)
    return false
  }
}

async function verifyTables() {
  console.log('\n🔍 Verifying tables created...\n')
  
  const checks = [
    {
      label: 'rate_limit_log table exists',
      sql: "SELECT COUNT(*) FROM information_schema.tables WHERE table_schema='public' AND table_name='rate_limit_log'"
    },
    {
      label: 'automation_rules table exists',
      sql: "SELECT COUNT(*) FROM information_schema.tables WHERE table_schema='public' AND table_name='automation_rules'"
    },
    {
      label: 'rate_limit_log has correct columns',
      sql: "SELECT column_name FROM information_schema.columns WHERE table_name='rate_limit_log' ORDER BY column_name"
    },
    {
      label: 'automation_rules has correct columns',
      sql: "SELECT column_name FROM information_schema.columns WHERE table_name='automation_rules' ORDER BY column_name"
    },
    {
      label: 'RLS enabled on automation_rules',
      sql: "SELECT rowsecurity FROM pg_tables WHERE tablename='automation_rules' AND schemaname='public'"
    },
    {
      label: 'RLS enabled on rate_limit_log',
      sql: "SELECT rowsecurity FROM pg_tables WHERE tablename='rate_limit_log' AND schemaname='public'"
    },
    {
      label: 'All tables with RLS status',
      sql: "SELECT tablename, rowsecurity FROM pg_tables WHERE schemaname='public' ORDER BY tablename"
    },
    {
      label: 'Check indexes on rate_limit_log',
      sql: "SELECT indexname FROM pg_indexes WHERE tablename='rate_limit_log'"
    },
  ]
  
  for (const check of checks) {
    const result = await runSQL(check.sql, check.label)
    try {
      const parsed = JSON.parse(result.body)
      console.log(`   Data:`, JSON.stringify(parsed).slice(0, 200))
    } catch {}
  }
}

;(async () => {
  console.log('🚀 Running catalog-saas Supabase migrations\n')
  console.log('Project:', PROJECT_REF)
  console.log('Migrations folder: supabase/migrations/\n')
  
  const migrations = [
    '016_rate_limit_log.sql',
    '017_automation_rules.sql', 
    '018_rls_audit.sql'
  ]
  
  const results = []
  for (const migration of migrations) {
    const ok = await runMigration(migration)
    results.push({ migration, ok })
  }
  
  await verifyTables()
  
  console.log('\n═══════════════════════════════════════')
  console.log('MIGRATION SUMMARY')
  console.log('═══════════════════════════════════════')
  for (const r of results) {
    console.log(`${r.ok ? '✅' : '❌'} ${r.migration}`)
  }
  
  const allOk = results.every(r => r.ok)
  console.log('\nAll migrations applied:', allOk ? '✅ YES' : '❌ NO')
})()
