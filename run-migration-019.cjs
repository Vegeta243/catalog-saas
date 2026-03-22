/**
 * Apply migration 019_security_hardening.sql to Supabase via Management API.
 * Run with: node run-migration-019.cjs
 */
const fs = require('fs');
const path = require('path');

const PAT = 'sbp_7aedc79d4e53e0aa12912c79993ee2c4e2fc025d';
const PROJECT_REF = 'mhroujagzclmdlfpiqju';

async function run() {
  const sqlPath = path.join(__dirname, 'supabase', 'migrations', '019_security_hardening.sql');
  const sql = fs.readFileSync(sqlPath, 'utf8');

  console.log('Applying migration 019_security_hardening.sql...');

  const res = await fetch(`https://api.supabase.com/v1/projects/${PROJECT_REF}/database/query`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${PAT}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ query: sql }),
  });

  const text = await res.text();

  if (!res.ok) {
    console.error('Migration FAILED:', res.status, text);
    process.exit(1);
  }

  console.log('Migration 019 applied successfully.');
  console.log('Response:', text.slice(0, 500));
}

run().catch(err => {
  console.error('Unexpected error:', err);
  process.exit(1);
});
