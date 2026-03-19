-- Migration 014 — Task tracking improvements
-- Ensures month-based reset, referral table, and proper defaults
-- Run in Supabase SQL Editor

-- ── 1. Fix free-plan default to 30 actions ──────────────────────────────────
UPDATE users SET actions_limit = 30 
WHERE plan = 'free' AND actions_limit NOT IN (1000, 20000, 100000);

ALTER TABLE users ALTER COLUMN actions_limit SET DEFAULT 30;

-- ── 2. Make reset_monthly_actions check month boundary correctly ─────────────
CREATE OR REPLACE FUNCTION public.reset_monthly_actions()
RETURNS void AS $$
BEGIN
  UPDATE public.users 
  SET actions_used = 0,
      actions_reset_at = DATE_TRUNC('month', NOW()) + INTERVAL '1 month',
      updated_at = NOW()
  WHERE actions_reset_at IS NULL 
     OR actions_reset_at <= NOW();
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ── 3. Auto-reset on read: apply within increment_actions ───────────────────
CREATE OR REPLACE FUNCTION public.increment_actions(p_user_id UUID, p_count INTEGER DEFAULT 1)
RETURNS INTEGER AS $$
DECLARE
  v_new_count INTEGER;
  v_reset_at TIMESTAMPTZ;
BEGIN
  -- Check if monthly reset is due
  SELECT actions_reset_at INTO v_reset_at
  FROM public.users WHERE id = p_user_id;
  
  IF v_reset_at IS NOT NULL AND v_reset_at <= NOW() THEN
    -- Reset the counter first
    UPDATE public.users 
    SET actions_used = 0,
        actions_reset_at = DATE_TRUNC('month', NOW()) + INTERVAL '1 month',
        updated_at = NOW()
    WHERE id = p_user_id;
  END IF;

  UPDATE public.users 
  SET actions_used = actions_used + p_count,
      updated_at = NOW()
  WHERE id = p_user_id
  RETURNING actions_used INTO v_new_count;
  
  RETURN COALESCE(v_new_count, 0);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ── 4. Referrals table ───────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.referrals (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  referrer_id     UUID REFERENCES public.users(id) ON DELETE CASCADE,
  referred_email  TEXT,
  referred_user_id UUID REFERENCES public.users(id) ON DELETE SET NULL,
  status          TEXT DEFAULT 'pending'
                  CHECK (status IN ('pending', 'signed_up', 'converted', 'rewarded')),
  referral_code   TEXT UNIQUE,
  reward_given    BOOLEAN DEFAULT false,
  created_at      TIMESTAMPTZ DEFAULT NOW(),
  converted_at    TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS referrals_referrer_idx ON public.referrals(referrer_id);
CREATE INDEX IF NOT EXISTS referrals_code_idx ON public.referrals(referral_code);

ALTER TABLE public.referrals ENABLE ROW LEVEL SECURITY;

CREATE POLICY IF NOT EXISTS "referrals_select_own" ON public.referrals
  FOR SELECT USING (referrer_id = auth.uid());

CREATE POLICY IF NOT EXISTS "referrals_insert_own" ON public.referrals
  FOR INSERT WITH CHECK (referrer_id = auth.uid());

CREATE POLICY IF NOT EXISTS "referrals_service_role" ON public.referrals
  FOR ALL USING (auth.role() = 'service_role');

-- ── 5. Add referral_code column to users ────────────────────────────────────
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS referral_code TEXT UNIQUE;
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS referred_by TEXT;

-- ── 6. Generate referral codes for existing users ───────────────────────────
UPDATE public.users
SET referral_code = UPPER(SUBSTRING(REPLACE(COALESCE(email, id::text), '@', ''), 1, 4)) 
                  || LPAD(FLOOR(RANDOM() * 9999)::TEXT, 4, '0')
WHERE referral_code IS NULL;

-- ── 7. Blocked email domains table ──────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.blocked_email_domains (
  domain TEXT PRIMARY KEY,
  reason TEXT DEFAULT 'disposable',
  added_at TIMESTAMPTZ DEFAULT NOW()
);

INSERT INTO public.blocked_email_domains (domain, reason) VALUES
  ('mailinator.com', 'disposable'),
  ('guerrillamail.com', 'disposable'),
  ('tempmail.com', 'disposable'),
  ('10minutemail.com', 'disposable'),
  ('throwam.com', 'disposable'),
  ('sharklasers.com', 'disposable'),
  ('guerrillamailblock.com', 'disposable'),
  ('grr.la', 'disposable'),
  ('guerrillamail.info', 'disposable'),
  ('guerrillamail.biz', 'disposable'),
  ('guerrillamail.de', 'disposable'),
  ('guerrillamail.net', 'disposable'),
  ('guerrillamail.org', 'disposable'),
  ('yopmail.com', 'disposable'),
  ('yopmail.fr', 'disposable'),
  ('cool.fr.nf', 'disposable'),
  ('jetable.fr.nf', 'disposable'),
  ('nospam.ze.tc', 'disposable'),
  ('nomail.xl.cx', 'disposable'),
  ('mega.zik.dj', 'disposable'),
  ('speed.1s.fr', 'disposable'),
  ('courriel.fr.nf', 'disposable'),
  ('moncourrier.fr.nf', 'disposable'),
  ('monemail.fr.nf', 'disposable'),
  ('monmail.fr.nf', 'disposable'),
  ('trashmail.at', 'disposable'),
  ('trashmail.com', 'disposable'),
  ('trashmail.io', 'disposable'),
  ('spamgourmet.com', 'disposable'),
  ('spamgourmet.net', 'disposable'),
  ('spamgourmet.org', 'disposable'),
  ('dispostable.com', 'disposable'),
  ('binkmail.com', 'disposable'),
  ('bobmail.info', 'disposable'),
  ('maildrop.cc', 'disposable'),
  ('mailnull.com', 'disposable'),
  ('getonemail.com', 'disposable'),
  ('filzmail.com', 'disposable'),
  ('zetmail.com', 'disposable'),
  ('cuvox.de', 'disposable'),
  ('dayrep.com', 'disposable'),
  ('einrot.com', 'disposable'),
  ('gustr.com', 'disposable'),
  ('teleworm.us', 'disposable'),
  ('fleckens.hu', 'disposable'),
  ('armyspy.com', 'disposable'),
  ('rhyta.com', 'disposable'),
  ('superrito.com', 'disposable'),
  ('jourrapide.com', 'disposable'),
  ('trbvm.com', 'disposable')
ON CONFLICT (domain) DO NOTHING;

-- ── 8. IP tracking for abuse prevention ─────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.signup_attempts (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  ip_address TEXT NOT NULL,
  email      TEXT,
  user_id    UUID,
  success    BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS signup_attempts_ip_idx ON public.signup_attempts(ip_address, created_at DESC);

-- Service role only access
ALTER TABLE public.signup_attempts ENABLE ROW LEVEL SECURITY;
CREATE POLICY IF NOT EXISTS "signup_service_role" ON public.signup_attempts
  FOR ALL USING (auth.role() = 'service_role');

-- ── 9. Auto-generate referral code on new user insert ────────────────────────
CREATE OR REPLACE FUNCTION public.generate_referral_code()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.referral_code IS NULL THEN
    NEW.referral_code := UPPER(
      SUBSTRING(REPLACE(COALESCE(NEW.email, NEW.id::text), '@', ''), 1, 4)
    ) || LPAD(FLOOR(RANDOM() * 9999)::TEXT, 4, '0');
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS set_referral_code ON public.users;
CREATE TRIGGER set_referral_code
  BEFORE INSERT ON public.users
  FOR EACH ROW EXECUTE FUNCTION public.generate_referral_code();

