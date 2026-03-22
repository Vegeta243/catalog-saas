/**
 * lib/rate-limit.ts
 * Thin wrapper around the Supabase-backed rate limiter.
 * All in-memory Maps removed — works correctly in Vercel serverless
 * where cold-starts reset any module-level state.
 */

import { checkRateLimitDB } from './rate-limit-db';

// ── Per-action defaults ──────────────────────────────────────────────────────
const DEFAULTS: Record<string, { maxRequests: number; windowMs: number }> = {
  "ai.generate":      { maxRequests: 20, windowMs: 60 * 60 * 1000 },  // 20 / hour
  "shopify.products": { maxRequests: 30, windowMs: 60 * 1000 },       // 30 / min
  "shopify.bulk":     { maxRequests: 5,  windowMs: 60 * 1000 },       // 5 / min
  "scrape":           { maxRequests: 10, windowMs: 60 * 1000 },       // 10 / min
  "auth":             { maxRequests: 10, windowMs: 15 * 60 * 1000 },  // 10 / 15 min
  "import":           { maxRequests: 30, windowMs: 60 * 60 * 1000 },  // 30 / hour
  "default":          { maxRequests: 60, windowMs: 60 * 1000 },       // 60 / min
};

export interface RateLimitResult {
  allowed: boolean;
  remaining: number;
  resetAt: number;
}

/**
 * Check rate-limit for a given user/IP + action.
 * Uses Supabase so the counter is shared across all serverless instances.
 */
export async function checkRateLimit(
  userId: string,
  action: string,
): Promise<RateLimitResult> {
  const opts = DEFAULTS[action] ?? DEFAULTS.default;
  return checkRateLimitDB(userId, action, opts.maxRequests, opts.windowMs);
}

export function getRateLimitHeaders(result: RateLimitResult): Record<string, string> {
  return {
    "X-RateLimit-Remaining": String(result.remaining),
    "X-RateLimit-Reset": String(Math.ceil(result.resetAt / 1000)),
  };
}
