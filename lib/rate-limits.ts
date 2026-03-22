/**
 * lib/rate-limits.ts
 * Centralised rate-limit configuration per endpoint type.
 * Used by API routes and middleware.
 */

export const RATE_LIMITS = {
  // ── Auth (strictest) ──────────────────────────────────────────────────────
  admin_login:      { max: 5,    windowMs: 15 * 60 * 1000 }, // 5 / 15 min
  admin_login_hard: { max: 15,   windowMs: 60 * 60 * 1000 }, // 15 / 1 h → lockout
  user_login:       { max: 10,   windowMs: 15 * 60 * 1000 }, // 10 / 15 min
  password_reset:   { max: 3,    windowMs: 60 * 60 * 1000 }, // 3 / hour

  // ── AI (expensive) ────────────────────────────────────────────────────────
  ai_generate:      { max: 20,   windowMs: 60 * 60 * 1000 }, // 20 / hour
  ai_bulk:          { max: 3,    windowMs: 60 * 60 * 1000 }, // 3 / hour
  ai_chat:          { max: 30,   windowMs: 60 * 60 * 1000 }, // 30 / hour

  // ── Import ────────────────────────────────────────────────────────────────
  import_scrape:    { max: 30,   windowMs: 60 * 60 * 1000 }, // 30 / hour

  // ── General ───────────────────────────────────────────────────────────────
  api_general:      { max: 200,  windowMs: 60 * 1000 },       // 200 / min

  // ── Shopify ───────────────────────────────────────────────────────────────
  shopify_sync:     { max: 10,   windowMs: 60 * 1000 },       // 10 / min
  shopify_products: { max: 30,   windowMs: 60 * 1000 },       // 30 / min

  // ── Webhooks (generous — Shopify / Stripe can retry aggressively) ─────────
  webhooks:         { max: 1000, windowMs: 60 * 1000 },       // 1000 / min
} as const;

export type RateLimitKey = keyof typeof RATE_LIMITS;

/**
 * Extract the real client IP from Vercel/proxy headers.
 * Prefer x-real-ip (set by Vercel), fallback to first entry in x-forwarded-for.
 */
export function getClientIP(headers: Headers): string {
  return (
    headers.get('x-real-ip') ||
    headers.get('x-forwarded-for')?.split(',')[0]?.trim() ||
    '127.0.0.1'
  );
}
