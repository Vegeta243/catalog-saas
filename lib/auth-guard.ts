/**
 * lib/auth-guard.ts
 * Reusable auth guard for API routes.
 *
 * Usage:
 *   const auth = await requireAuth()
 *   if (isAuthError(auth)) return auth
 *   const { userId, plan, actionsUsed, actionsLimit } = auth
 */

import { createClient } from '@/lib/supabase/server';
import { NextResponse } from 'next/server';

export interface AuthResult {
  userId: string;
  plan: string;
  email: string;
  actionsUsed: number;
  actionsLimit: number;
}

export type AuthGuardResult = AuthResult | NextResponse;

/**
 * Verify the caller is authenticated via Supabase session.
 * Returns AuthResult on success, or a 401 NextResponse on failure.
 */
export async function requireAuth(): Promise<AuthGuardResult> {
  const supabase = await createClient();
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();

  if (error || !user) {
    return NextResponse.json(
      { error: 'Non autorisé. Veuillez vous connecter.' },
      { status: 401 }
    );
  }

  const { data: userData } = await supabase
    .from('users')
    .select('plan, actions_used, actions_limit')
    .eq('id', user.id)
    .single();

  return {
    userId: user.id,
    plan: userData?.plan ?? 'free',
    email: user.email ?? '',
    actionsUsed: userData?.actions_used ?? 0,
    actionsLimit: userData?.actions_limit ?? 30,
  };
}

/**
 * Type guard — returns true if the result is an auth error response.
 *
 * if (isAuthError(auth)) return auth
 */
export function isAuthError(result: AuthGuardResult): result is NextResponse {
  return result instanceof NextResponse;
}

/**
 * Check if the current request comes from an authenticated admin.
 * Used in admin-only API routes that don't go through middleware.
 */
export async function requireAdminAuth(): Promise<boolean> {
  try {
    const { cookies } = await import('next/headers');
    const { verifyAdminSession } = await import('@/lib/admin-security');
    const cookieStore = await cookies();
    const token = cookieStore.get('admin_session')?.value;
    if (!token) return false;
    const result = await verifyAdminSession(token);
    return result.valid;
  } catch {
    return false;
  }
}
