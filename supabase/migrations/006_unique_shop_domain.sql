-- Migration 006 — Unique shop domain constraint
-- Ensures one shop domain can only be connected to one user account
-- Run this in Supabase SQL Editor AFTER migration 005

-- First, remove any duplicate inactive entries (keep only the most recent per domain)
DELETE FROM shops a USING shops b
WHERE a.id < b.id
  AND a.shop_domain = b.shop_domain
  AND a.is_active = false;

-- Add unique constraint on shop_domain (only one active record per domain)
-- If you want strict uniqueness (even inactive), use: UNIQUE (shop_domain)
-- If you want to allow the same domain to be re-used after deletion, use partial index:
CREATE UNIQUE INDEX IF NOT EXISTS unique_active_shop_domain
  ON shops (shop_domain)
  WHERE is_active = true;
