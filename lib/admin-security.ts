/**
 * Admin security utilities
 * - HMAC-SHA256 session token generation & verification
 * - Admin auth rate limiting (strict: 5 attempts / 15 min per IP)
 * - Audit log helper
 */

import crypto from 'crypto';

// ─── HMAC session ───────────────────────────────────────────────────────────

const SECRET = process.env.ADMIN_SECRET_KEY || '';

/**
 * Generate a signed admin session token.
 * Format (base64url): <email>:<timestamp>.<hmac>
 */
export function createAdminSession(email: string): string {
  const payload = `${email}:${Date.now()}`;
  const sig = crypto
    .createHmac('sha256', SECRET)
    .update(payload)
    .digest('hex');
  return Buffer.from(`${payload}.${sig}`).toString('base64url');
}

export interface SessionResult {
  valid: boolean;
  email?: string;
}

/**
 * Verify a signed admin session token.
 * Returns { valid: true, email } on success, { valid: false } otherwise.
 */
export function verifyAdminSession(token: string): SessionResult {
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

    // Constant-time comparison to prevent timing attacks
    if (!crypto.timingSafeEqual(Buffer.from(sig, 'hex'), Buffer.from(expected, 'hex'))) {
      return { valid: false };
    }

    const colonIdx = payload.lastIndexOf(':');
    const email = payload.slice(0, colonIdx);
    const timestamp = Number(payload.slice(colonIdx + 1));
    const age = Date.now() - timestamp;

    if (age > 8 * 60 * 60 * 1000) return { valid: false }; // 8 h expiry
    if (email !== process.env.ADMIN_EMAIL) return { valid: false };

    return { valid: true, email };
  } catch {
    return { valid: false };
  }
}

// ─── Rate limiting for admin login ───────────────────────────────────────────

interface Window { count: number; resetAt: number }
const loginAttempts = new Map<string, Window>();

/** 5 attempts per 15 minutes per IP */
export function checkAdminLoginRate(ip: string): { allowed: boolean; retryAfterSec: number } {
  const max = 5;
  const windowMs = 15 * 60 * 1000;
  const now = Date.now();

  let w = loginAttempts.get(ip);
  if (!w || now > w.resetAt) {
    w = { count: 0, resetAt: now + windowMs };
    loginAttempts.set(ip, w);
  }
  w.count++;

  return {
    allowed: w.count <= max,
    retryAfterSec: Math.ceil((w.resetAt - now) / 1000),
  };
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
