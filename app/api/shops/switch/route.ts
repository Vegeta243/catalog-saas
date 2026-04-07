import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function POST(req: Request) {
  const supabase = await createClient()
  const { data: { user }, error: authErr } = await supabase.auth.getUser()
  if (authErr || !user) {
    return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })
  }

  const body = await req.json()
  const { shop_domain } = body as { shop_domain?: string }
  if (!shop_domain || typeof shop_domain !== 'string') {
    return NextResponse.json({ error: 'shop_domain requis' }, { status: 400 })
  }

  // Verify the shop belongs to this user
  const { data: shop, error: shopErr } = await supabase
    .from('shops')
    .select('id, shop_domain')
    .eq('user_id', user.id)
    .eq('shop_domain', shop_domain)
    .single()

  if (shopErr || !shop) {
    return NextResponse.json({ error: 'Boutique introuvable' }, { status: 404 })
  }

  // Set active shop via cookie (server-side, no DB migration needed)
  const response = NextResponse.json({ ok: true, shop_domain })
  response.cookies.set('active_shop_domain', shop_domain, {
    httpOnly: true,
    path: '/',
    sameSite: 'lax',
    maxAge: 60 * 60 * 24 * 365, // 1 year
    secure: process.env.NODE_ENV === 'production',
  })
  return response
}

