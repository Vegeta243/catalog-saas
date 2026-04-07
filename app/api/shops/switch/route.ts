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

  // Persist active shop domain to users table
  try {
    await supabase
      .from('users')
      .update({ active_shop_domain: shop_domain })
      .eq('id', user.id)
  } catch {
    // Column may not exist yet — ignore silently
  }

  return NextResponse.json({ ok: true, shop_domain })
}
