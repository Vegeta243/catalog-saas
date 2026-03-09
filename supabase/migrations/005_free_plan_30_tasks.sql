-- Migration 005 — Free plan: 50 → 30 actions
-- Run this in Supabase SQL Editor

-- Update existing free plan users who still have the old default of 50
UPDATE users SET actions_limit = 30 WHERE plan = 'free' AND (actions_limit = 50 OR actions_limit IS NULL);

-- Update default for new free users
-- (Only affects users without an explicit actions_limit set by stripe webhook)
ALTER TABLE users ALTER COLUMN actions_limit SET DEFAULT 30;
