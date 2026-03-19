import { cookies } from 'next/headers';
import { verifyAdminSession } from '@/lib/admin-security';

/**
 * Server-side admin auth check (Node.js runtime — API routes, Server Components).
 * Uses verifyAdminSession() with full HMAC-SHA256 validation.
 */
export async function isAdminAuthenticated(): Promise<boolean> {
  try {
    const cookieStore = await cookies();
    const adminSession = cookieStore.get('admin_session');
    if (!adminSession?.value) return false;
    const result = verifyAdminSession(adminSession.value);
    return result.valid;
  } catch {
    return false;
  }
}
