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

// 1. admin_audit_log (columns match what the code actually uses)
const adminAuditSQL = `
CREATE TABLE IF NOT EXISTS public.admin_audit_log (
  id         BIGSERIAL    PRIMARY KEY,
  action     TEXT         NOT NULL,
  target     TEXT,
  details    JSONB        DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS admin_audit_log_created_at_idx ON admin_audit_log (created_at DESC);
CREATE INDEX IF NOT EXISTS admin_audit_log_action_idx     ON admin_audit_log (action);
ALTER TABLE admin_audit_log ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "service role only" ON admin_audit_log;
CREATE POLICY "service role only" ON admin_audit_log
  USING (auth.role() = 'service_role')
  WITH CHECK (auth.role() = 'service_role');
`;

// 2. chatbot_logs
const chatbotLogsSQL = `
CREATE TABLE IF NOT EXISTS public.chatbot_logs (
  id                   BIGSERIAL    PRIMARY KEY,
  user_id              UUID         NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  session_id           TEXT         NOT NULL DEFAULT gen_random_uuid()::text,
  messages             JSONB        NOT NULL DEFAULT '[]'::jsonb,
  unanswered_question  TEXT         DEFAULT NULL,
  intent               TEXT         DEFAULT NULL,
  resolved             BOOLEAN      DEFAULT false,
  created_at           TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
  updated_at           TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS chatbot_logs_user_id_idx    ON chatbot_logs (user_id);
CREATE INDEX IF NOT EXISTS chatbot_logs_created_at_idx ON chatbot_logs (created_at DESC);
CREATE INDEX IF NOT EXISTS chatbot_logs_unresolved_idx ON chatbot_logs (resolved) WHERE resolved = false;
ALTER TABLE chatbot_logs ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "users own chatbot logs" ON chatbot_logs;
DROP POLICY IF EXISTS "service role chatbot logs" ON chatbot_logs;
CREATE POLICY "users own chatbot logs" ON chatbot_logs
  FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "service role chatbot logs" ON chatbot_logs
  FOR ALL USING (auth.role() = 'service_role');
`;

console.log('Running migration: admin_audit_log...');
const r1 = await apiQuery(adminAuditSQL);
console.log('Result:', JSON.stringify(r1));

console.log('Running migration: chatbot_logs...');
const r2 = await apiQuery(chatbotLogsSQL);
console.log('Result:', JSON.stringify(r2));

console.log('Done!');
