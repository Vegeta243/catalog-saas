// Fix RLS policies on the shops table using direct PostgreSQL connection
// Run: node scripts/fix-rls-direct.mjs

import postgres from 'postgres';

// Supabase project: mhroujagzclmdlfpiqju
// Default Supabase pooler connection string pattern
const DATABASE_URL = process.env.DATABASE_URL ||
  `postgresql://postgres.mhroujagzclmdlfpiqju:${process.env.SUPABASE_DB_PASSWORD}@aws-0-eu-west-3.pooler.supabase.com:6543/postgres`;

if (!process.env.SUPABASE_DB_PASSWORD && !process.env.DATABASE_URL) {
  console.log('');
  console.log('╔══════════════════════════════════════════════════════════════════╗');
  console.log('║  ÉTAPE MANUELLE REQUISE — Exécutez ce SQL dans Supabase        ║');
  console.log('╚══════════════════════════════════════════════════════════════════╝');
  console.log('');
  console.log('Allez sur: https://supabase.com/dashboard/project/mhroujagzclmdlfpiqju/sql/new');
  console.log('');
  console.log('Copiez et exécutez ce SQL:');
  console.log('');
  console.log(`
-- ============================================================
-- Fix RLS policies on shops table for proper user isolation
-- ============================================================

-- Drop ALL existing shop policies
DROP POLICY IF EXISTS "shops_select_own" ON public.shops;
DROP POLICY IF EXISTS "shops_insert_own" ON public.shops;
DROP POLICY IF EXISTS "shops_update_own" ON public.shops;
DROP POLICY IF EXISTS "shops_delete_own" ON public.shops;
DROP POLICY IF EXISTS "shops_service_role" ON public.shops;
DROP POLICY IF EXISTS "Users can view own shops" ON public.shops;
DROP POLICY IF EXISTS "Users can manage own shops" ON public.shops;
DROP POLICY IF EXISTS "Service role full access to shops" ON public.shops;

-- Users can only SELECT their own shops
CREATE POLICY "shops_select_own" ON public.shops
  FOR SELECT USING (user_id = auth.uid());

-- Users can only INSERT shops with their own user_id
CREATE POLICY "shops_insert_own" ON public.shops
  FOR INSERT WITH CHECK (user_id = auth.uid());

-- Users can only UPDATE their own shops
CREATE POLICY "shops_update_own" ON public.shops
  FOR UPDATE USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

-- Users can only DELETE their own shops
CREATE POLICY "shops_delete_own" ON public.shops
  FOR DELETE USING (user_id = auth.uid());

-- Service role (server-side operations, webhooks) bypasses RLS by default
-- but add explicit policy for clarity
CREATE POLICY "shops_service_role" ON public.shops
  FOR ALL USING (auth.role() = 'service_role');
  `);
  console.log('');
  process.exit(0);
}

const sql = postgres(DATABASE_URL, { ssl: 'require' });

try {
  console.log('Connecting to database...');
  
  // Drop existing broken policies
  await sql`DROP POLICY IF EXISTS "shops_select_own" ON public.shops`;
  await sql`DROP POLICY IF EXISTS "shops_insert_own" ON public.shops`;
  await sql`DROP POLICY IF EXISTS "shops_update_own" ON public.shops`;
  await sql`DROP POLICY IF EXISTS "shops_delete_own" ON public.shops`;
  await sql`DROP POLICY IF EXISTS "shops_service_role" ON public.shops`;
  await sql`DROP POLICY IF EXISTS "Users can view own shops" ON public.shops`;
  await sql`DROP POLICY IF EXISTS "Users can manage own shops" ON public.shops`;
  await sql`DROP POLICY IF EXISTS "Service role full access to shops" ON public.shops`;
  console.log('✓ Old policies dropped');

  // Create correct policies
  await sql`CREATE POLICY "shops_select_own" ON public.shops FOR SELECT USING (user_id = auth.uid())`;
  await sql`CREATE POLICY "shops_insert_own" ON public.shops FOR INSERT WITH CHECK (user_id = auth.uid())`;
  await sql`CREATE POLICY "shops_update_own" ON public.shops FOR UPDATE USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid())`;
  await sql`CREATE POLICY "shops_delete_own" ON public.shops FOR DELETE USING (user_id = auth.uid())`;
  await sql`CREATE POLICY "shops_service_role" ON public.shops FOR ALL USING (auth.role() = 'service_role')`;
  console.log('✓ New policies created');

  // Verify
  const policies = await sql`SELECT policyname, cmd FROM pg_catalog.pg_policies WHERE tablename = 'shops'`;
  console.log('\nCurrent policies:');
  for (const p of policies) {
    console.log(`  - ${p.policyname} (${p.cmd})`);
  }

  console.log('\n✅ RLS policies fixed successfully!');
  await sql.end();
} catch (err) {
  console.error('Error:', err.message);
  await sql.end();
  process.exit(1);
}
