import { createClient as createAdminClient } from '@supabase/supabase-js'
import { createClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'
import webpush from 'web-push'

export async function POST(request: NextRequest) {
  // Initialise VAPID inside the handler so env vars are available at runtime
  webpush.setVapidDetails(
    process.env.VAPID_SUBJECT!,
    process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY!,
    process.env.VAPID_PRIVATE_KEY!,
  )
  // Admin-only endpoint
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const adminEmail = process.env.NEXT_PUBLIC_ADMIN_EMAIL
  if (user.email !== adminEmail) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const { title, body, url, userIds } = await request.json()
  if (!title || !body) {
    return NextResponse.json({ error: 'Missing title or body' }, { status: 400 })
  }

  const admin = createAdminClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )

  let query = admin.from('push_subscriptions').select('user_id, subscription')
  if (userIds && Array.isArray(userIds) && userIds.length > 0) {
    query = query.in('user_id', userIds)
  }

  const { data: subscriptions, error } = await query
  if (error) {
    return NextResponse.json({ error: 'DB error' }, { status: 500 })
  }

  const payload = JSON.stringify({
    title,
    body,
    url: url || '/dashboard',
    icon: '/icons/icon-192x192.png',
    badge: '/icons/icon-72x72.png',
  })

  const results = await Promise.allSettled(
    (subscriptions ?? []).map(async (row) => {
      const sub = typeof row.subscription === 'string'
        ? JSON.parse(row.subscription)
        : row.subscription
      await webpush.sendNotification(sub, payload)
      return row.user_id
    })
  )

  const sent = results.filter(r => r.status === 'fulfilled').length
  const failed = results.filter(r => r.status === 'rejected').length

  return NextResponse.json({ sent, failed, total: subscriptions?.length ?? 0 })
}
