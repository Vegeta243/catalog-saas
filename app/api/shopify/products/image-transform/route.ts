import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export const maxDuration = 60

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user }, error: authErr } = await supabase.auth.getUser()
    if (authErr || !user) {
      return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })
    }

    const body = await request.json()
    const { productIds, brightness, contrast, width, height, cropEnabled, cropTop, cropLeft, cropW, cropH } = body

    if (!productIds || !Array.isArray(productIds) || productIds.length === 0) {
      return NextResponse.json({ error: 'Aucun produit sélectionné' }, { status: 400 })
    }

    // Get shop credentials
    const { data: shops } = await supabase
      .from('shops')
      .select('*')
      .eq('user_id', user.id)
      .eq('is_active', true)
      .limit(1)

    const shop = shops?.[0] as Record<string, unknown> | undefined
    if (!shop) {
      return NextResponse.json({ error: 'Boutique non connectée' }, { status: 400 })
    }

    const shopDomain =
      (typeof shop.shop_domain === 'string' && shop.shop_domain) ||
      (typeof shop.domain === 'string' && shop.domain) ||
      (typeof shop.shopify_domain === 'string' && shop.shopify_domain) || ''
    const accessToken =
      (typeof shop.access_token === 'string' && shop.access_token) ||
      (typeof shop.token === 'string' && shop.token) ||
      (typeof shop.shopify_token === 'string' && shop.shopify_token) || ''

    if (!shopDomain || !accessToken) {
      return NextResponse.json({ error: 'Identifiants boutique manquants' }, { status: 400 })
    }

    const settings = {
      brightness: brightness ?? 100,
      contrast: contrast ?? 100,
      width: width || null,
      height: height || null,
      crop: cropEnabled ? { top: cropTop || 0, left: cropLeft || 0, width: cropW || null, height: cropH || null } : null,
    }

    let successCount = 0
    let failCount = 0

    for (const pid of productIds) {
      try {
        const res = await fetch(
          `https://${shopDomain}/admin/api/2024-01/products/${pid}.json`,
          {
            method: 'PUT',
            headers: {
              'X-Shopify-Access-Token': accessToken,
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              product: {
                id: pid,
                metafields: [{
                  namespace: 'ecompilot',
                  key: 'image_settings',
                  value: JSON.stringify(settings),
                  type: 'json',
                }],
              },
            }),
          }
        )
        if (res.ok) {
          successCount++
        } else {
          failCount++
        }
      } catch {
        failCount++
      }
    }

    // Update local DB updated_at
    await supabase
      .from('shopify_products')
      .update({ updated_at: new Date().toISOString() })
      .eq('user_id', user.id)
      .in('shopify_product_id', productIds)

    return NextResponse.json({
      successCount,
      failCount,
      message: `${successCount} produit(s) mis à jour${failCount > 0 ? `, ${failCount} échec(s)` : ''}`,
    })
  } catch (err) {
    console.error('[image-transform]', err)
    return NextResponse.json({ error: 'Erreur interne' }, { status: 500 })
  }
}
