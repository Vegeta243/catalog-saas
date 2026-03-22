import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { verifyAdminSession } from '@/lib/admin-security';
import { createClient } from '@supabase/supabase-js';

export async function GET(request: NextRequest) {
  // Verify admin session
  const cookieStore = await cookies();
  const token = cookieStore.get('admin_session')?.value;
  const session = await verifyAdminSession(token ?? '');
  if (!session.valid) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const limit = Math.min(parseInt(searchParams.get('limit') || '100'), 200);
  const offset = parseInt(searchParams.get('offset') || '0');
  const action = searchParams.get('action') || null;

  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );

  let query = supabase
    .from('admin_audit_log')
    .select('*', { count: 'exact' })
    .order('created_at', { ascending: false })
    .range(offset, offset + limit - 1);

  if (action) query = query.eq('action', action);

  const { data, error, count } = await query;

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ entries: data, total: count });
}
