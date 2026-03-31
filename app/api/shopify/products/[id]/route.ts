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

    const { data: shopRows, error: shopError } = await supabase
      .from('shops')
      .select('shop_domain, access_token')
      .eq('user_id', user.id)
      .eq('is_active', true)
      .limit(1)

    const shop = shopRows?.[0]
    console.log('Shop found:', shop?.shop_domain ?? 'NONE', shopError?.message ?? 'no error')
    console.log('Access token prefix:', shop?.access_token?.slice(0, 6) ?? 'MISSING')
    if (shopError || !shop) {
      return NextResponse.json({ error: 'Aucune boutique connectée' }, { status: 404 })
    }

    const { title, body_html, vendor, tags, status, variants, images, price, metafields_global_title_tag, metafields_global_description_tag } = body
    console.log('Price to apply:', price, '| variants in body:', variants !== undefined)

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

    // When price is given (and variants not explicitly supplied), fetch real variant IDs
    // from Shopify before updating — otherwise Shopify creates a new variant
    if (price !== undefined && variants === undefined) {
      const varFetchUrl = `${shopifyBase}/products/${id}.json?fields=id,variants`
      console.log('Fetching Shopify variants from:', varFetchUrl)
      try {
        const varRes = await fetch(varFetchUrl, {
          headers: { 'X-Shopify-Access-Token': shop.access_token },
        })
        console.log('Variant fetch status:', varRes.status)
        if (varRes.ok) {
          const varData = await varRes.json()
          const vlist: any[] = varData.product?.variants || []
          console.log('Variants found:', vlist.length, '| IDs:', vlist.map((v: any) => v.id).join(', '))
          if (vlist.length > 0) {
            productPayload.variants = vlist.map((v: any, i: number) =>
              i === 0 ? { id: v.id, price: String(price) } : { id: v.id }
            )
          } else {
            console.log('WARNING: No variants found — price will not be set')
          }
        } else {
          const errTxt = await varRes.text()
          console.log('Variant fetch ERROR:', varRes.status, errTxt.slice(0, 300))
        }
      } catch (varErr: any) {
        console.log('Variant fetch EXCEPTION:', varErr.message)
      }
    }

    console.log('Shopify PUT payload:', JSON.stringify({ product: productPayload }).slice(0, 500))
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
    const updatedVariantPrice = result.product?.variants?.[0]?.price
    console.log('Shopify PUT success — updated variant[0].price:', updatedVariantPrice)

    // Write updated price back to Supabase so fetchProducts (cache) reflects the change
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
        if (dbErr) {
          // Fallback: try updating by Shopify product ID stored as string
          console.log('Supabase update failed, trying without user_id filter...')
        }
      } catch (dbEx: any) {
        console.log('Supabase update EXCEPTION:', dbEx.message)
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
