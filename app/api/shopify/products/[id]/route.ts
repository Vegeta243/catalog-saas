import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  console.log('=== PUT /api/shopify/products/[id] START ===')
  try {
    const { id } = await params
    console.log('Product ID param:', id)
    const body = await request.json()
    console.log('Request body:', JSON.stringify(body))

    const supabase = await createClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    console.log('Auth:', user?.id ?? 'NO USER', authError?.message ?? 'no error')
    if (authError || !user) {
      return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })
    }

    // Resolve exact shop for this product (avoids wrong shop when user has multiple active shops)
    const { data: productRow } = await supabase
      .from('shopify_products')
      .select('shop_domain')
      .eq('shopify_product_id', id)
      .eq('user_id', user.id)
      .maybeSingle()
    console.log('Product row shop_domain:', productRow?.shop_domain ?? 'NOT FOUND IN DB')

    const shopBaseQuery = supabase
      .from('shops')
      .select('shop_domain, access_token')
      .eq('user_id', user.id)
      .eq('is_active', true)

    const { data: shopRows, error: shopError } = productRow?.shop_domain
      ? await shopBaseQuery.eq('shop_domain', productRow.shop_domain).limit(1)
      : await shopBaseQuery.limit(1)

    const shop = shopRows?.[0]
    console.log('Shop found:', shop?.shop_domain ?? 'NONE', shopError?.message ?? 'no error')
    console.log('Access token prefix:', shop?.access_token?.slice(0, 6) ?? 'MISSING')
    if (shopError || !shop) {
      return NextResponse.json({ error: 'Aucune boutique connectée' }, { status: 404 })
    }

    const { title, body_html, vendor, tags, status, variants, images, price, metafields_global_title_tag, metafields_global_description_tag } = body
    console.log('Price to apply:', price, '| variants in body:', variants !== undefined)

    const shopifyBase = `https://${shop.shop_domain}/admin/api/2024-01`
    const shopifyHeaders = {
      'Content-Type': 'application/json',
      'X-Shopify-Access-Token': shop.access_token,
    }

    // ── PRICE UPDATE: use variant-level API (reliable, no silent failures) ──
    if (price !== undefined && variants === undefined) {
      console.log('Price-only update path — using variant-level API')
      const varFetchUrl = `${shopifyBase}/products/${id}.json?fields=id,variants`
      console.log('Fetching Shopify variants from:', varFetchUrl)
      const varRes = await fetch(varFetchUrl, {
        headers: { 'X-Shopify-Access-Token': shop.access_token },
      })
      console.log('Variant fetch status:', varRes.status)
      if (!varRes.ok) {
        const errTxt = await varRes.text()
        console.log('Variant fetch ERROR:', varRes.status, errTxt.slice(0, 300))
        return NextResponse.json({ error: `Impossible de récupérer les variants Shopify: ${varRes.status}` }, { status: 502 })
      }
      const varData = await varRes.json()
      const vlist: any[] = varData.product?.variants || []
      console.log('Variants found:', vlist.length, '| IDs:', vlist.map((v: any) => v.id).join(', '))
      if (vlist.length === 0) {
        return NextResponse.json({ error: 'Aucun variant trouvé pour ce produit sur Shopify' }, { status: 404 })
      }

      // Update ALL variants with new price via variant-level PUT
      for (const variant of vlist) {
        const varUpdateUrl = `${shopifyBase}/variants/${variant.id}.json`
        console.log('Updating variant', variant.id, 'to price', String(price))
        const varUpdateRes = await fetch(varUpdateUrl, {
          method: 'PUT',
          headers: shopifyHeaders,
          body: JSON.stringify({ variant: { id: variant.id, price: String(price) } }),
        })
        const varUpdateData = await varUpdateRes.json().catch(() => ({}))
        console.log('Variant', variant.id, 'update result:', varUpdateRes.status, 'new price:', (varUpdateData as any).variant?.price)
        if (!varUpdateRes.ok) {
          const errMsg = JSON.stringify((varUpdateData as any).errors || varUpdateData).slice(0, 200)
          console.log('Variant update ERROR:', errMsg)
          return NextResponse.json({ error: `Erreur variant Shopify ${varUpdateRes.status}: ${errMsg}` }, { status: varUpdateRes.status })
        }
      }

      // Update Supabase cache
      const parsedPrice = parseFloat(String(price))
      console.log('Updating Supabase: shopify_product_id=', id, 'price=', parsedPrice)
      try {
        const { error: dbErr, count } = await supabase
          .from('shopify_products')
          .update({ price: parsedPrice, updated_at: new Date().toISOString() })
          .eq('shopify_product_id', id)
          .eq('user_id', user.id)
        console.log('Supabase update result:', dbErr?.message ?? 'success', '| rows affected:', count)
      } catch (dbEx: any) {
        console.log('Supabase update EXCEPTION (non-blocking):', dbEx.message)
      }

      console.log('=== PUT SUCCESS (price via variants) ===')
      return NextResponse.json({ success: true })
    }

    // ── ALL OTHER FIELD UPDATES: product-level PUT ──
    // Build main product payload — metafields handled separately below
    const productPayload: Record<string, unknown> = { id: parseInt(id) }
    if (title !== undefined) productPayload.title = title
    if (body_html !== undefined) productPayload.body_html = body_html
    if (vendor !== undefined) productPayload.vendor = vendor
    if (tags !== undefined) productPayload.tags = Array.isArray(tags) ? tags.join(',') : tags
    if (status !== undefined) productPayload.status = status
    if (images !== undefined) productPayload.images = images
    // When variants are explicitly sent (e.g. from edit modal with price + ID), include them directly
    if (variants !== undefined) productPayload.variants = variants
    // If price given alongside other fields (e.g., from edit modal), fetch real variant IDs first
    if (price !== undefined && variants === undefined) {
      try {
        const varRes2 = await fetch(`${shopifyBase}/products/${id}.json?fields=id,variants`, {
          headers: { 'X-Shopify-Access-Token': shop.access_token },
        })
        if (varRes2.ok) {
          const varData2 = await varRes2.json()
          const vlist2: any[] = varData2.product?.variants || []
          if (vlist2.length > 0) {
            productPayload.variants = vlist2.map((v: any, i: number) =>
              i === 0 ? { id: v.id, price: String(price) } : { id: v.id }
            )
          }
        }
      } catch { /* best-effort */ }
    }

    console.log('Shopify product PUT payload:', JSON.stringify({ product: productPayload }).slice(0, 500))
    const shopifyRes = await fetch(`${shopifyBase}/products/${id}.json`, {
      method: 'PUT',
      headers: shopifyHeaders,
      body: JSON.stringify({ product: productPayload }),
    })
    console.log('Shopify PUT status:', shopifyRes.status)

    if (!shopifyRes.ok) {
      const err = await shopifyRes.text()
      console.error('Shopify PUT error:', shopifyRes.status, err)
      return NextResponse.json({ error: 'Erreur Shopify: ' + shopifyRes.statusText }, { status: shopifyRes.status })
    }

    const result = await shopifyRes.json()
    console.log('Shopify PUT success — variant[0].price:', result.product?.variants?.[0]?.price)

    // Write updated price back to Supabase
    if (price !== undefined) {
      const parsedPrice = parseFloat(String(price))
      console.log('Updating Supabase: shopify_product_id=', id, 'price=', parsedPrice)
      try {
        const { error: dbErr, count } = await supabase
          .from('shopify_products')
          .update({ price: parsedPrice, updated_at: new Date().toISOString() })
          .eq('shopify_product_id', id)
          .eq('user_id', user.id)
        console.log('Supabase update result:', dbErr?.message ?? 'success', '| rows affected:', count)
      } catch (dbEx: any) {
        console.log('Supabase update EXCEPTION (non-blocking):', dbEx.message)
      }
    }

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

    console.log('=== PUT SUCCESS ===')
    return NextResponse.json({ product: result.product, success: true })
  } catch (error) {
    console.error('=== PUT ERROR ===', (error as Error).message, (error as Error).stack)
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

    const { data: shopRows2, error: shopError } = await supabase
      .from('shops')
      .select('shop_domain, access_token')
      .eq('user_id', user.id)
      .eq('is_active', true)
      .limit(1)

    const shop = shopRows2?.[0]
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
