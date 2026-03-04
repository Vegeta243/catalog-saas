import https from 'https';

// Usage: SUPABASE_ACCESS_TOKEN=sbp_xxx node scripts/verify-migration.mjs
const PAT = process.env.SUPABASE_ACCESS_TOKEN;
const PROJECT_REF = process.env.NEXT_PUBLIC_SUPABASE_URL?.split('//')[1]?.split('.')[0] || 'mhroujagzclmdlfpiqju';

if (!PAT) {
  console.error('❌ Définissez la variable SUPABASE_ACCESS_TOKEN');
  console.error('   Exemple: $env:SUPABASE_ACCESS_TOKEN="sbp_xxx"; node scripts/verify-migration.mjs');
  process.exit(1);
}

const run = (sql) => new Promise((res, rej) => {
  const payload = JSON.stringify({ query: sql });
  const options = {
    hostname: 'api.supabase.com',
    path: `/v1/projects/${PROJECT_REF}/database/query`,
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${PAT}`,
      'Content-Type': 'application/json',
      'Content-Length': Buffer.byteLength(payload)
    }
  };
  const req = https.request(options, (r) => {
    let d = '';
    r.on('data', c => d += c);
    r.on('end', () => res({ status: r.statusCode, body: JSON.parse(d) }));
  });
  req.on('error', rej);
  req.write(payload);
  req.end();
});

const results = await Promise.all([
  run("SELECT 'users' as table_name, COUNT(*) as count FROM public.users"),
  run("SELECT 'shops' as table_name, COUNT(*) as count FROM public.shops"),
  run("SELECT trigger_name FROM information_schema.triggers WHERE trigger_schema = 'public' ORDER BY trigger_name"),
  run("SELECT proname FROM pg_proc WHERE proname IN ('handle_new_user', 'update_updated_at_column')"),
]);

console.log('\n✅ VÉRIFICATION MIGRATION SUPABASE\n');
console.log('Table users :', results[0].status === 201 ? '✅ EXISTE' : '❌ ERREUR', JSON.stringify(results[0].body));
console.log('Table shops :', results[1].status === 201 ? '✅ EXISTE' : '❌ ERREUR', JSON.stringify(results[1].body));
console.log('Triggers    :', results[2].body.map(r => r.trigger_name).join(', '));
console.log('Fonctions   :', results[3].body.map(r => r.proname).join(', '));
console.log('\n✅ Migration complète !\n');
