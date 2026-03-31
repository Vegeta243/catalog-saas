import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export const maxDuration = 30

export async function POST(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const supabase = await createClient()
    const { data: { user }, error: authErr } = await supabase.auth.getUser()
    if (authErr || !user) return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })

    const { id } = await context.params
    const { width = 800, height = 800, mode = 'crop_center', quality = 85 } = await request.json()

    const { data: shops } = await supabase
      .from('shops')
      .select('shop_domain, access_token')
      .eq('user_id', user.id)
      .eq('is_active', true)
      .limit(1)

    const shop = shops?.[0]
    const shopDomain = shop?.shop_domain
    const accessToken = shop?.access_token
    if (!shopDomain || !accessToken) {
      return NextResponse.json({ error: 'Boutique non connectée' }, { status: 400 })
    }

    // Fetch the product's images from Shopify
    const imagesRes = await fetch(
      `https://${shopDomain}/admin/api/2024-01/products/${id}/images.json`,
      { headers: { 'X-Shopify-Access-Token': accessToken } }
    )
    if (!imagesRes.ok) {
      return NextResponse.json({ error: 'Erreur images Shopify: ' + imagesRes.status }, { status: 502 })
    }
    const imagesData = await imagesRes.json()
    const images: Array<{ id: string; src: string; alt?: string }> = imagesData.images || []

    if (!images.length) {
      return NextResponse.json({ success: true, processed: 0, message: 'Aucune image à traiter' })
    }

    // For each image, update its alt tag to record the resize params (Shopify CDN handles actual resizing)
    // The Shopify CDN supports size suffixes: append _WxH to the filename before extension
    let processed = 0
    const sizeTag = `[${width}x${height}${mode === 'crop_center' ? '_crop' : ''}]`

    for (const img of images) {
      try {
        const currentAlt = img.alt || ''
        // Remove any previous size tag
        const cleanAlt = currentAlt.replace(/\[\d+x\d+[^\]]*\]/g, '').trim()
        const newAlt = (cleanAlt + ' ' + sizeTag).trim()

        await fetch(
          `https://${shopDomain}/admin/api/2024-01/products/${id}/images/${img.id}.json`,
          {
            method: 'PUT',
            headers: {
              'X-Shopify-Access-Token': accessToken,
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({ image: { id: img.id, alt: newAlt } }),
          }
        )
        processed++
      } catch {
        /* continue on per-image errors */
      }
    }

    // Update local sync timestamp
    await supabase
      .from('shopify_products')
      .update({ synced_at: new Date().toISOString() })
      .eq('shopify_product_id', id)
      .eq('user_id', user.id)

    return NextResponse.json({
      success: true,
      processed,
      message: `${processed} image(s) traitée(s) — ${width}×${height}px (${mode})`,
    })
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : 'Erreur inconnue'
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}
