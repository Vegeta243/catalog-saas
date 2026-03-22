/**
 * lib/env-validation.ts
 * Validates required environment variables on server startup.
 * Call validateEnv() from the root layout (server component) or
 * any early boot point.
 */

/** Variables required for the app to function at all */
const REQUIRED_VARS = [
  'NEXT_PUBLIC_SUPABASE_URL',
  'NEXT_PUBLIC_SUPABASE_ANON_KEY',
  'SUPABASE_SERVICE_ROLE_KEY',
  'ADMIN_SECRET_KEY',
  'ADMIN_EMAIL',
  'ADMIN_PASSWORD',
] as const;

/** Variables that are strongly recommended but not immediately fatal */
const RECOMMENDED_VARS = [
  'STRIPE_SECRET_KEY',
  'STRIPE_WEBHOOK_SECRET',
  'OPENAI_API_KEY',
  'RESEND_API_KEY',
  'SHOPIFY_API_KEY',
  'SHOPIFY_API_SECRET',
  'ENCRYPTION_KEY',
  'NEXT_PUBLIC_SITE_URL',
] as const;

/**
 * Variables that MUST NEVER be prefixed with NEXT_PUBLIC_ — they would be
 * included in the client bundle and visible to everyone.
 */
const FORBIDDEN_PUBLIC_VARS = [
  'NEXT_PUBLIC_SUPABASE_SERVICE_ROLE_KEY',
  'NEXT_PUBLIC_OPENAI_API_KEY',
  'NEXT_PUBLIC_STRIPE_SECRET_KEY',
  'NEXT_PUBLIC_ADMIN_PASSWORD',
  'NEXT_PUBLIC_ADMIN_SECRET_KEY',
  'NEXT_PUBLIC_SHOPIFY_API_SECRET',
] as const;

/**
 * Run at boot. In production, throws if required vars are missing.
 * In development, only warns.
 */
export function validateEnv(): void {
  // ── Critical: secrets must never be in NEXT_PUBLIC_ namespace ────────────
  for (const key of FORBIDDEN_PUBLIC_VARS) {
    if (process.env[key]) {
      throw new Error(
        `[SECURITY CRITICAL] Secret leaked to client bundle via ${key}. ` +
        `Remove it from your environment immediately!`
      );
    }
  }

  // ── Required vars ─────────────────────────────────────────────────────────
  const missing = REQUIRED_VARS.filter(k => !process.env[k]);
  if (missing.length > 0) {
    const msg = `[ENV] Missing required environment variables: ${missing.join(', ')}`;
    if (process.env.NODE_ENV === 'production') {
      throw new Error(msg);
    } else {
      console.warn(msg);
    }
  }

  // ── Recommended vars ─────────────────────────────────────────────────────
  const missingRec = RECOMMENDED_VARS.filter(k => !process.env[k]);
  if (missingRec.length > 0) {
    console.warn(`[ENV] Optional env vars not configured: ${missingRec.join(', ')}`);
  }
}
