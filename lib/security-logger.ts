/**
 * lib/security-logger.ts
 * Security event logging — fire-and-forget, never throws.
 * Also provides a structured error logger that sanitizes sensitive fields.
 */

import { createClient } from '@supabase/supabase-js';

export type SecuritySeverity = 'info' | 'warning' | 'critical';

export interface SecurityEventDetails {
  userId?: string;
  ipAddress?: string;
  userAgent?: string;
  extra?: Record<string, unknown>;
}

/**
 * Log a security event to the security_events table.
 * Fire-and-forget — never throws or blocks the main request.
 */
export async function logSecurityEvent(
  eventType: string,
  severity: SecuritySeverity,
  details: SecurityEventDetails = {}
): Promise<void> {
  try {
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
      { auth: { persistSession: false } }
    );
    await supabase.from('security_events').insert({
      event_type: eventType,
      severity,
      user_id: details.userId ?? null,
      ip_address: details.ipAddress ?? null,
      user_agent: details.userAgent?.slice(0, 200) ?? null,
      details: details.extra ?? {},
    });
  } catch {
    // Logging must never break the main flow
  }
}

/** Keys that must never appear in logs */
const SENSITIVE_KEYS = ['password', 'token', 'secret', 'key', 'authorization', 'cookie'];

/**
 * Structured error logger that strips sensitive fields before logging.
 * Replaces plain console.error throughout API routes.
 */
export function logError(
  context: string,
  error: unknown,
  metadata?: Record<string, string | number | boolean>
): void {
  const safeMetadata = metadata
    ? Object.fromEntries(
        Object.entries(metadata).filter(
          ([k]) => !SENSITIVE_KEYS.some(s => k.toLowerCase().includes(s))
        )
      )
    : {};

  console.error(`[${context}]`, {
    message: error instanceof Error ? error.message : String(error),
    timestamp: new Date().toISOString(),
    ...safeMetadata,
  });
}
