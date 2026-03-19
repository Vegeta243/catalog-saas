import { NextRequest, NextResponse } from 'next/server';
import { isAdminAuthenticated } from '@/lib/admin-auth';

/**
 * GET /api/admin/check
 * Returns { isAdmin: boolean } — used by client-side pages to gate admin-only features.
 */
export async function GET(_request: NextRequest) {
  try {
    const admin = await isAdminAuthenticated();
    return NextResponse.json({ isAdmin: admin });
  } catch {
    return NextResponse.json({ isAdmin: false });
  }
}
