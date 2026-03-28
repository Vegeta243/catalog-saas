import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })

    const { id } = await params
    const { imageBase64, filename } = await request.json()
    if (!imageBase64) return NextResponse.json({ error: 'Image requise' }, { status: 400 })

    const { data: shops } = await supabase.from('shops').select('*')
      .eq('user_id', user.id).eq('is_active', true).limit(1)
    const shop = shops?.[0]
    const shopDomain = shop?.shop_domain || shop?.domain
    const accessToken = shop?.access_token || shop?.token

    if (!shopDomain || !accessToken) {
      return NextResponse.json({ error: 'Boutique non connectée' }, { status: 400 })
    }

    const res = await fetch(
      `https://${shopDomain}/admin/api/2024-01/products/${id}/images.json`,
      {
        method: 'POST',
        headers: { 'X-Shopify-Access-Token': accessToken, 'Content-Type': 'application/json' },
        body: JSON.stringify({ image: { attachment: imageBase64, filename: filename || 'product-image.jpg' } })
      }
    )
    const data = await res.json()
    if (!res.ok) return NextResponse.json({ error: 'Erreur Shopify: ' + JSON.stringify(data) }, { status: 502 })
    return NextResponse.json({ image: data.image })
  } catch (e: unknown) {
    const message = e instanceof Error ? e.message : 'Unknown error'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
