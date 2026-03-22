/**
 * lib/rate-limit-db.ts
 * Supabase-backed rate limiter — works correctly in Vercel serverless
 * (no shared in-memory state between invocations).
 */

import { createClient } from '@supabase/supabase-js';

interface RateLimitResult {
  allowed: boolean;
  remaining: number;
  resetAt: number;
}

/**
 * Check and record a rate-limit event in Supabase.
 *
 * @param identifier - User ID or IP address
 * @param action     - Action key, e.g. "ai.generate", "admin.login"
 * @param maxRequests - Maximum allowed in the window
 * @param windowMs    - Window duration in milliseconds
 */
export async function checkRateLimitDB(
  identifier: string,
  action: string,
  maxRequests: number,
  windowMs: number
): Promise<RateLimitResult> {
  const resetAt = Date.now() + windowMs;
  try {
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
      { auth: { persistSession: false } }
    );

    const windowStart = new Date(Date.now() - windowMs).toISOString();
    const key = `${action}:${identifier}`;

    // Count requests in this window
    const { count } = await supabase
      .from('rate_limit_log')
      .select('*', { count: 'exact', head: true })
      .eq('key', key)
      .gte('created_at', windowStart);

    const current = count ?? 0;

    if (current >= maxRequests) {
      return { allowed: false, remaining: 0, resetAt };
    }

    // Record this request
    await supabase
      .from('rate_limit_log')
      .insert({ key, created_at: new Date().toISOString() });

    // Fire-and-forget cleanup of stale records (>24 h) to keep the table small
    void supabase
      .from('rate_limit_log')
      .delete()
      .lt('created_at', new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString());

    return {
      allowed: true,
      remaining: maxRequests - current - 1,
      resetAt,
    };
  } catch {
    // If DB is unreachable, fail open (allow) to avoid blocking legitimate users
    return { allowed: true, remaining: 1, resetAt };
  }
}
