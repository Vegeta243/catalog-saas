/**
 * Admin security utilities
 * - HMAC-SHA256 session token with jti claim (enables logout blacklisting)
 * - Token blacklist stored in Supabase (logout invalidation)
 * - Two-tier rate limiting: 5/15min + 15/1h lockout
 * - Audit log helper
 */

import crypto from 'crypto';
import { createClient } from '@supabase/supabase-js';
import { checkRateLimitDB } from './rate-limit-db';

// ─── HMAC session ───────────────────────────────────────────────────────────

const SECRET = process.env.ADMIN_SECRET_KEY || '';

/**
 * Create a signed admin session token with a jti (JWT ID) for blacklisting.
 * Token format (base64url): <jti>|<email>:<timestamp>.<hmac>
 */
export function createAdminSession(email: string): string {
  const jti = crypto.randomUUID();
  const payload = `${jti}|${email}:${Date.now()}`;
  const sig = crypto
    .createHmac('sha256', SECRET)
    .update(payload)
    .digest('hex');
  return Buffer.from(`${payload}.${sig}`).toString('base64url');
}

export interface SessionResult {
  valid: boolean;
  email?: string;
  jti?: string;
}

/** Parse and HMAC-verify the token synchronously. Does NOT check the blacklist. */
function parseTokenSync(token: string): SessionResult & { expiresAt?: Date } {
  if (!SECRET) return { valid: false };
  try {
    const raw = Buffer.from(token, 'base64url').toString();
    const dotIdx = raw.lastIndexOf('.');
    if (dotIdx < 0) return { valid: false };

    const payload = raw.slice(0, dotIdx);
    const sig = raw.slice(dotIdx + 1);

    const expected = crypto
      .createHmac('sha256', SECRET)
      .update(payload)
      .digest('hex');

    // Constant-time comparison — both buffers must be the same length
    const sigBuf = Buffer.from(sig, 'hex');
    const expBuf = Buffer.from(expected, 'hex');
    if (sigBuf.length !== expBuf.length) return { valid: false };
    if (!crypto.timingSafeEqual(sigBuf, expBuf)) return { valid: false };

    // Parse jti|email:timestamp
    const pipeIdx = payload.indexOf('|');
    if (pipeIdx < 0) return { valid: false }; // old format (no jti) → reject

    const jti = payload.slice(0, pipeIdx);
    const rest = payload.slice(pipeIdx + 1);
    const colonIdx = rest.lastIndexOf(':');
    if (colonIdx < 0) return { valid: false };

    const email = rest.slice(0, colonIdx);
    const timestamp = Number(rest.slice(colonIdx + 1));
    if (isNaN(timestamp)) return { valid: false };

    const age = Date.now() - timestamp;
    if (age > 8 * 60 * 60 * 1000) return { valid: false }; // 8 h expiry
    if (email !== process.env.ADMIN_EMAIL) return { valid: false };

    const expiresAt = new Date(timestamp + 8 * 60 * 60 * 1000);
    return { valid: true, email, jti, expiresAt };
  } catch {
    return { valid: false };
  }
}

/**
 * Verify an admin session token.
 * Checks HMAC + expiry (sync) and token blacklist (async Supabase lookup).
 */
export async function verifyAdminSession(token: string): Promise<SessionResult> {
  const parsed = parseTokenSync(token);
  if (!parsed.valid || !parsed.jti) return { valid: false };

  // Check blacklist (fail open if DB unavailable — don't block legitimate admins)
  try {
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
      { auth: { persistSession: false } }
    );
    const { data } = await supabase
      .from('admin_token_blacklist')
      .select('jti')
      .eq('jti', parsed.jti)
      .maybeSingle();
    if (data) return { valid: false }; // token was explicitly invalidated on logout
  } catch {
    // Blacklist unreachable — fail open (prefer availability over strict security)
  }

  return { valid: true, email: parsed.email, jti: parsed.jti };
}

/**
 * Add a session token's jti to the blacklist (call on logout).
 * Fire-and-forget — never throws.
 */
export async function invalidateAdminSession(token: string): Promise<void> {
  const parsed = parseTokenSync(token);
  if (!parsed.valid || !parsed.jti || !parsed.expiresAt) return;

  try {
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
      { auth: { persistSession: false } }
    );

    await supabase.from('admin_token_blacklist').insert({
      jti: parsed.jti,
      expires_at: parsed.expiresAt.toISOString(),
    });

    // Cleanup entries that have fully expired (best-effort)
    void supabase
      .from('admin_token_blacklist')
      .delete()
      .lt('expires_at', new Date().toISOString());
  } catch {
    // Blacklist failure must not block logout
  }
}

// ─── Rate limiting for admin login (two-tier) ────────────────────────────────

/**
 * Two-tier rate limit for admin login:
 * - Tier 1: 5 failed attempts per 15 min  → short lockout
 * - Tier 2: 15 failed attempts per 1 hour → 1-hour lockout
 */
export async function checkAdminLoginRate(ip: string): Promise<{
  allowed: boolean;
  retryAfterSec: number;
  lockedOut: boolean;
}> {
  // Tier 1: 5 attempts / 15 min
  const short = await checkRateLimitDB(ip, 'admin.login', 5, 15 * 60 * 1000);
  if (!short.allowed) {
    return {
      allowed: false,
      retryAfterSec: Math.ceil((short.resetAt - Date.now()) / 1000),
      lockedOut: false,
    };
  }

  // Tier 2: 15 attempts / 1 hour (hard lockout)
  const hard = await checkRateLimitDB(ip, 'admin.login.hard', 15, 60 * 60 * 1000);
  if (!hard.allowed) {
    return {
      allowed: false,
      retryAfterSec: Math.ceil((hard.resetAt - Date.now()) / 1000),
      lockedOut: true,
    };
  }

  return { allowed: true, retryAfterSec: 0, lockedOut: false };
}

// ─── Audit log ───────────────────────────────────────────────────────────────

export interface AuditEntry {
  action: string;
  targetType?: string;
  targetId?: string;
  detail?: Record<string, unknown>;
  ip?: string;
  userAgent?: string;
}

/**
 * Write an entry to admin_audit_log via Supabase service role.
 * Fire-and-forget — does not throw on failure.
 */
export async function writeAuditLog(adminEmail: string, entry: AuditEntry): Promise<void> {
  try {
    const { createClient } = await import('@supabase/supabase-js');
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );
    await supabase.from('admin_audit_log').insert({
      admin_email: adminEmail,
      action: entry.action,
      target_type: entry.targetType ?? null,
      target_id: entry.targetId ?? null,
      detail: entry.detail ?? {},
      ip: entry.ip ?? null,
      user_agent: entry.userAgent ?? null,
    });
  } catch {
    // Audit failures must never block the main request
  }
}
