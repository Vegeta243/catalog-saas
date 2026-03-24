import https from 'https';

const PAT = 'sbp_7aedc79d4e53e0aa12912c79993ee2c4e2fc025d';
const PROJECT = 'mhroujagzclmdlfpiqju';

function apiQuery(sql) {
  return new Promise((resolve, reject) => {
    const body = JSON.stringify({ query: sql });
    const opts = {
      hostname: 'api.supabase.com',
      path: `/v1/projects/${PROJECT}/database/query`,
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${PAT}`,
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(body),
      },
    };
    const req = https.request(opts, r => {
      let d = '';
      r.on('data', c => d += c);
      r.on('end', () => {
        try { resolve(JSON.parse(d)); }
        catch { resolve(d); }
      });
    });
    req.on('error', reject);
    req.write(body);
    req.end();
  });
}

const tables = await apiQuery("SELECT tablename FROM pg_tables WHERE schemaname='public' ORDER BY tablename;");
console.log('=== Existing tables ===');
if (Array.isArray(tables)) {
  tables.forEach(r => console.log(' -', r.tablename));
} else {
  console.log(JSON.stringify(tables));
}

const userCols = await apiQuery("SELECT column_name FROM information_schema.columns WHERE table_name='users' ORDER BY column_name;");
console.log('\n=== users columns ===');
userCols.forEach(r => console.log(' -', r.column_name));

const wsCols = await apiQuery("SELECT column_name FROM information_schema.columns WHERE table_name='workspaces' ORDER BY column_name;");
console.log('\n=== workspaces columns ===');
wsCols.forEach(r => console.log(' -', r.column_name));

const chatbotCols = await apiQuery("SELECT column_name FROM information_schema.columns WHERE table_name='chatbot_logs' ORDER BY column_name;");
console.log('\n=== chatbot_logs columns ===');
chatbotCols.forEach(r => console.log(' -', r.column_name));
