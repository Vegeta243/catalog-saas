-- ─────────────────────────────────────────────
-- Admin audit log
-- ─────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS admin_audit_log (
  id          BIGSERIAL PRIMARY KEY,
  admin_email TEXT         NOT NULL,
  action      TEXT         NOT NULL,
  target_type TEXT,                          -- e.g. 'user', 'plan', 'system'
  target_id   TEXT,                          -- e.g. userId or planName
  detail      JSONB        DEFAULT '{}'::jsonb,
  ip          TEXT,
  user_agent  TEXT,
  created_at  TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);

-- Index for fast admin queries
CREATE INDEX IF NOT EXISTS admin_audit_log_created_at_idx ON admin_audit_log (created_at DESC);
CREATE INDEX IF NOT EXISTS admin_audit_log_action_idx     ON admin_audit_log (action);

-- Only server-side service role can write; no RLS needed for admin-only table
ALTER TABLE admin_audit_log ENABLE ROW LEVEL SECURITY;
-- Allow service role (used server-side) full access; block anon/authenticated
CREATE POLICY "service role only" ON admin_audit_log
  USING (false)
  WITH CHECK (false);
