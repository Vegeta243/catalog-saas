// Script to fix RLS policies on the shops table
// Run: node scripts/fix-rls.mjs

const SUPABASE_URL = 'https://mhroujagzclmdlfpiqju.supabase.co';
const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im1ocm91amFnemNsbWRsZnBpcWp1Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3MjEzMDc3MSwiZXhwIjoyMDg3NzA2NzcxfQ.40R_n_gu0HH4m3cO7vcm2kjPJ_F50Fu9kUf7RDCv1x8';

const PROJECT_REF = 'mhroujagzclmdlfpiqju';

// Try the Management API
async function runSQL(sql) {
  // Method 1: Try /pg endpoint (newer Supabase)
  try {
    const res = await fetch(`${SUPABASE_URL}/pg`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${SERVICE_KEY}`,
      },
      body: JSON.stringify({ query: sql }),
    });
    if (res.ok) {
      const data = await res.json();
      return { ok: true, data };
    }
  } catch {}

  // Method 2: Try creating a helper function via RPC
  const { createClient } = await import('@supabase/supabase-js');
  const supabase = createClient(SUPABASE_URL, SERVICE_KEY, {
    db: { schema: 'public' },
  });

  // Try using raw SQL via the admin functions endpoint
  try {
    const res = await fetch(`${SUPABASE_URL}/rest/v1/rpc/`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${SERVICE_KEY}`,
        'apikey': SERVICE_KEY,
      },
      body: JSON.stringify({ name: 'exec_sql', args: { sql } }),
    });
    console.log('RPC status:', res.status);
  } catch {}

  return { ok: false };
}

async function checkPolicies() {
  const { createClient } = await import('@supabase/supabase-js');
  const supabase = createClient(SUPABASE_URL, SERVICE_KEY);

  // Check if we can query shops at all
  const { data: shops, error } = await supabase
    .from('shops')
    .select('id, user_id, shop_domain')
    .limit(5);

  console.log('Current shops in DB:');
  if (error) {
    console.log('  Error:', error.message);
  } else {
    for (const s of shops || []) {
      console.log(`  - ${s.shop_domain} | user_id: ${s.user_id || 'NULL'}`);
    }
  }
}

async function main() {
  console.log('=== Checking current state ===');
  await checkPolicies();

  console.log('\n=== Attempting to fix RLS policies ===');
  const sql = `
    DROP POLICY IF EXISTS "shops_select_own" ON public.shops;
    DROP POLICY IF EXISTS "shops_insert_own" ON public.shops;
    DROP POLICY IF EXISTS "shops_update_own" ON public.shops;
    DROP POLICY IF EXISTS "shops_service_role" ON public.shops;
    DROP POLICY IF EXISTS "Users can view own shops" ON public.shops;
    DROP POLICY IF EXISTS "Users can manage own shops" ON public.shops;
    DROP POLICY IF EXISTS "Service role full access to shops" ON public.shops;

    CREATE POLICY "shops_select_own" ON public.shops
      FOR SELECT USING (user_id = auth.uid());

    CREATE POLICY "shops_insert_own" ON public.shops
      FOR INSERT WITH CHECK (user_id = auth.uid());

    CREATE POLICY "shops_update_own" ON public.shops
      FOR UPDATE USING (user_id = auth.uid())
      WITH CHECK (user_id = auth.uid());

    CREATE POLICY "shops_delete_own" ON public.shops
      FOR DELETE USING (user_id = auth.uid());

    CREATE POLICY "shops_service_role" ON public.shops
      FOR ALL USING (auth.role() = 'service_role');
  `;

  const result = await runSQL(sql);
  if (result.ok) {
    console.log('RLS policies updated successfully!');
  } else {
    console.log('Could not execute SQL directly.');
    console.log('');
    console.log('>>> MANUAL STEP REQUIRED <<<');
    console.log('Go to https://supabase.com/dashboard/project/mhroujagzclmdlfpiqju/sql/new');
    console.log('and run this SQL:');
    console.log(sql);
  }
}

main().catch(console.error);
