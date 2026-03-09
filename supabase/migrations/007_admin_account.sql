-- Migration 007: Admin account — Scale plan for Elliott / Dushane243
-- Run in Supabase SQL Editor after deployment
--
-- This gives the admin account (elliottshilenge5@gmail.com) Scale plan
-- with near-unlimited tasks, permanently active subscription.

UPDATE users
SET
  plan = 'scale',
  actions_limit = 999999,
  actions_used = 0,
  subscription_status = 'active'
WHERE email = 'elliottshilenge5@gmail.com';
