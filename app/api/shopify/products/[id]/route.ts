import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const body = await request.json()

    const supabase = await createClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })
    }

    const { data: shop, error: shopError } = await supabase
      .from('shops')
      .select('shop_domain, access_token')
      .eq('user_id', user.id)
      .eq('is_active', true)
      .single()

    if (shopError || !shop) {
      return NextResponse.json({ error: 'Aucune boutique connectée' }, { status: 404 })
    }

    const { title, body_html, vendor, tags, status, variants, images, metafields_global_title_tag, metafields_global_description_tag } = body

    // Build main product payload — metafields handled separately below
    const productPayload: Record<string, unknown> = { id: parseInt(id) }
    if (title !== undefined) productPayload.title = title
    if (body_html !== undefined) productPayload.body_html = body_html
    if (vendor !== undefined) productPayload.vendor = vendor
    if (tags !== undefined) productPayload.tags = Array.isArray(tags) ? tags.join(',') : tags
    if (status !== undefined) productPayload.status = status
    if (variants !== undefined) productPayload.variants = variants
    if (images !== undefined) productPayload.images = images

    const shopifyBase = `https://${shop.shop_domain}/admin/api/2024-01`
    const shopifyHeaders = {
      'Content-Type': 'application/json',
      'X-Shopify-Access-Token': shop.access_token,
    }

    const shopifyRes = await fetch(`${shopifyBase}/products/${id}.json`, {
      method: 'PUT',
      headers: shopifyHeaders,
      body: JSON.stringify({ product: productPayload }),
    })

    if (!shopifyRes.ok) {
      const err = await shopifyRes.text()
      console.error('Shopify PUT error:', shopifyRes.status, err)
      return NextResponse.json({ error: 'Erreur Shopify: ' + shopifyRes.statusText }, { status: shopifyRes.status })
    }

    const result = await shopifyRes.json()

    // Handle SEO metafields via the Metafields API (not inline on product)
    const seoFields: { key: string; value: string; type: string }[] = []
    if (metafields_global_title_tag !== undefined && metafields_global_title_tag !== '')
      seoFields.push({ key: 'title_tag', value: String(metafields_global_title_tag), type: 'single_line_text_field' })
    if (metafields_global_description_tag !== undefined && metafields_global_description_tag !== '')
      seoFields.push({ key: 'description_tag', value: String(metafields_global_description_tag), type: 'multi_line_text_field' })

    if (seoFields.length > 0) {
      try {
        const mfRes = await fetch(`${shopifyBase}/products/${id}/metafields.json?namespace=global`, {
          headers: shopifyHeaders,
        })
        const mfData = mfRes.ok ? await mfRes.json() : { metafields: [] }
        const existing: any[] = mfData.metafields || []

        for (const sf of seoFields) {
          const found = existing.find((m: any) => m.namespace === 'global' && m.key === sf.key)
          if (found) {
            await fetch(`${shopifyBase}/metafields/${found.id}.json`, {
              method: 'PUT',
              headers: shopifyHeaders,
              body: JSON.stringify({ metafield: { id: found.id, value: sf.value, type: sf.type } }),
            })
          } else {
            await fetch(`${shopifyBase}/products/${id}/metafields.json`, {
              method: 'POST',
              headers: shopifyHeaders,
              body: JSON.stringify({ metafield: { namespace: 'global', key: sf.key, value: sf.value, type: sf.type } }),
            })
          }
        }
      } catch (mfErr) {
        console.warn('Metafields update error (non-blocking):', mfErr)
      }
    }

    return NextResponse.json({ product: result.product, success: true })
  } catch (error) {
    console.error('PUT /api/shopify/products/[id]:', error)
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })
  }
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const supabase = await createClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })
    }

    const { data: shop, error: shopError } = await supabase
      .from('shops')
      .select('shop_domain, access_token')
      .eq('user_id', user.id)
      .eq('is_active', true)
      .single()

    if (shopError || !shop) {
      return NextResponse.json({ error: 'Aucune boutique connectée' }, { status: 404 })
    }

    const shopifyUrl = `https://${shop.shop_domain}/admin/api/2024-01/products/${id}.json`
    const shopifyRes = await fetch(shopifyUrl, {
      headers: { 'X-Shopify-Access-Token': shop.access_token },
    })

    if (!shopifyRes.ok) {
      return NextResponse.json({ error: 'Produit introuvable' }, { status: shopifyRes.status })
    }

    const result = await shopifyRes.json()
    return NextResponse.json({ product: result.product })
  } catch (error) {
    console.error('GET /api/shopify/products/[id]:', error)
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })
  }
}
