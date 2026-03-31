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
    const { productIds, shopifyProductIds, action, value } = body

    // Accept either local UUIDs (productIds) or Shopify IDs (shopifyProductIds)
    const hasIds = (shopifyProductIds?.length ?? 0) > 0 || (productIds?.length ?? 0) > 0
    if (!hasIds || !action) {
      return NextResponse.json({ error: !action ? 'Action manquante' : 'Aucun produit sélectionné' }, { status: 400 })
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

    // Fetch products from local DB — prefer shopify_product_id lookup to avoid UUID mapping issues
    let dbQuery = supabase
      .from('shopify_products')
      .select('id, shopify_product_id, title, price, tags, status, vendor, body_html, variants')
      .eq('user_id', user.id)

    if (shopifyProductIds?.length > 0) {
      dbQuery = dbQuery.in('shopify_product_id', shopifyProductIds.map(String))
    } else {
      dbQuery = dbQuery.in('id', productIds)
    }

    const { data: dbProducts, error: prodErr } = await dbQuery

    if (prodErr || !dbProducts || dbProducts.length === 0) {
      return NextResponse.json({ error: 'Produits introuvables en base' }, { status: 404 })
    }

    const shopifyBase = `https://${shopDomain}/admin/api/2024-01`
    const shopifyHeaders = {
      'Content-Type': 'application/json',
      'X-Shopify-Access-Token': accessToken,
    }

    let successCount = 0
    let errorCount = 0
    const results: { id: string; success?: boolean; error?: string }[] = []

    for (const product of dbProducts) {
      try {
        const shopifyId = product.shopify_product_id
        if (!shopifyId) {
          results.push({ id: product.id, error: 'Pas de Shopify ID' })
          errorCount++
          continue
        }

        const currentPrice = typeof product.price === 'number'
          ? product.price
          : parseFloat(String(product.price || '0'))

        // Parse variants (may be stored as JSON string or array)
        let variants: any[] = []
        if (Array.isArray(product.variants)) {
          variants = product.variants
        } else if (typeof product.variants === 'string') {
          try { variants = JSON.parse(product.variants) } catch { variants = [] }
        }

        let shopifyPayload: Record<string, unknown> = {}
        let dbUpdate: Record<string, unknown> = {}
        // For price actions, prefer variant-level Shopify API (more reliable, no variant format issues)
        let variantPriceUpdate: { id: string | number; price: string } | null = null

        switch (action) {
          case 'set_price': {
            const newPrice = Math.max(0, Math.round(parseFloat(String(value || '0')) * 100) / 100)
            if (isNaN(newPrice)) throw new Error('Prix invalide')
            const firstVariant = variants[0]
            if (firstVariant?.id) {
              variantPriceUpdate = { id: firstVariant.id, price: newPrice.toFixed(2) }
            } else {
              // No variant ID in local DB — fetch from Shopify to get real variant IDs
              const spRes = await fetch(`${shopifyBase}/products/${shopifyId}.json?fields=id,variants`, { headers: shopifyHeaders })
              if (spRes.ok) {
                const spData = await spRes.json()
                const rv = spData.product?.variants?.[0]
                if (rv?.id) variantPriceUpdate = { id: rv.id, price: newPrice.toFixed(2) }
              }
              if (!variantPriceUpdate) shopifyPayload = { id: shopifyId, variants: [{ price: newPrice.toFixed(2) }] }
            }
            dbUpdate = { price: newPrice }
            break
          }
          case 'increase_price_percent': {
            const pct = parseFloat(String(value || '0'))
            const newPrice = Math.max(0, Math.round(currentPrice * (1 + pct / 100) * 100) / 100)
            const firstVariant = variants[0]
            if (firstVariant?.id) {
              variantPriceUpdate = { id: firstVariant.id, price: newPrice.toFixed(2) }
            } else {
              const spRes = await fetch(`${shopifyBase}/products/${shopifyId}.json?fields=id,variants`, { headers: shopifyHeaders })
              if (spRes.ok) {
                const spData = await spRes.json()
                const rv = spData.product?.variants?.[0]
                if (rv?.id) variantPriceUpdate = { id: rv.id, price: newPrice.toFixed(2) }
              }
              if (!variantPriceUpdate) shopifyPayload = { id: shopifyId, variants: [{ price: newPrice.toFixed(2) }] }
            }
            dbUpdate = { price: newPrice }
            break
          }
          case 'decrease_price_percent': {
            const pct = parseFloat(String(value || '0'))
            const newPrice = Math.max(0, Math.round(currentPrice * (1 - pct / 100) * 100) / 100)
            const firstVariant = variants[0]
            if (firstVariant?.id) {
              variantPriceUpdate = { id: firstVariant.id, price: newPrice.toFixed(2) }
            } else {
              const spRes = await fetch(`${shopifyBase}/products/${shopifyId}.json?fields=id,variants`, { headers: shopifyHeaders })
              if (spRes.ok) {
                const spData = await spRes.json()
                const rv = spData.product?.variants?.[0]
                if (rv?.id) variantPriceUpdate = { id: rv.id, price: newPrice.toFixed(2) }
              }
              if (!variantPriceUpdate) shopifyPayload = { id: shopifyId, variants: [{ price: newPrice.toFixed(2) }] }
            }
            dbUpdate = { price: newPrice }
            break
          }
          case 'add_tag': {
            if (!value) throw new Error('Tag manquant')
            const existing = (product.tags || '').split(',').map((t: string) => t.trim()).filter(Boolean)
            const toAdd = String(value).split(',').map((t: string) => t.trim()).filter(Boolean)
            const merged = [...new Set([...existing, ...toAdd])].join(', ')
            shopifyPayload = { id: shopifyId, tags: merged }
            dbUpdate = { tags: merged }
            break
          }
          case 'tags_add': {
            if (!value) throw new Error('Tag manquant')
            const existing2 = (product.tags || '').split(',').map((t: string) => t.trim()).filter(Boolean)
            const toAdd2 = String(value).split(',').map((t: string) => t.trim()).filter(Boolean)
            const merged2 = [...new Set([...existing2, ...toAdd2])].join(', ')
            shopifyPayload = { id: shopifyId, tags: merged2 }
            dbUpdate = { tags: merged2 }
            break
          }
          case 'set_status': {
            const s = ['active', 'draft', 'archived'].includes(String(value)) ? String(value) : 'draft'
            shopifyPayload = { id: shopifyId, status: s }
            dbUpdate = { status: s }
            break
          }
          case 'status': {
            const s2 = ['active', 'draft', 'archived'].includes(String(value)) ? String(value) : 'draft'
            shopifyPayload = { id: shopifyId, status: s2 }
            dbUpdate = { status: s2 }
            break
          }
          case 'set_vendor': {
            if (typeof value !== 'string') throw new Error('Fournisseur invalide')
            shopifyPayload = { id: shopifyId, vendor: value }
            dbUpdate = { vendor: value }
            break
          }
          case 'title_suffix': {
            if (!value) throw new Error('Texte manquant')
            const newTitle = (product.title || '') + ' ' + String(value)
            shopifyPayload = { id: shopifyId, title: newTitle }
            dbUpdate = { title: newTitle }
            break
          }
          case 'round_99': {
            const newPrice2 = Math.max(0, Math.floor(currentPrice) - 0.01)
            const firstVariant2 = variants[0]
            if (firstVariant2?.id) {
              variantPriceUpdate = { id: firstVariant2.id, price: newPrice2.toFixed(2) }
            } else {
              const spRes2 = await fetch(`${shopifyBase}/products/${shopifyId}.json?fields=id,variants`, { headers: shopifyHeaders })
              if (spRes2.ok) {
                const spData2 = await spRes2.json()
                const rv2 = spData2.product?.variants?.[0]
                if (rv2?.id) variantPriceUpdate = { id: rv2.id, price: newPrice2.toFixed(2) }
              }
              if (!variantPriceUpdate) shopifyPayload = { id: shopifyId, variants: [{ price: newPrice2.toFixed(2) }] }
            }
            dbUpdate = { price: newPrice2 }
            break
          }
          default:
            throw new Error('Action non reconnue: ' + action)
        }

        // Call Shopify — variant-level PUT for prices (reliable), product-level PUT for other fields
        if (variantPriceUpdate) {
          const varRes = await fetch(`${shopifyBase}/variants/${variantPriceUpdate.id}.json`, {
            method: 'PUT',
            headers: shopifyHeaders,
            body: JSON.stringify({ variant: variantPriceUpdate }),
          })
          const varData = await varRes.json().catch(() => ({}))
          if (!varRes.ok) {
            const errMsg = JSON.stringify((varData as any).errors || varData).slice(0, 200)
            throw new Error(`Shopify variant ${varRes.status}: ${errMsg}`)
          }
        } else if (Object.keys(shopifyPayload).length > 0) {
          const shopifyRes = await fetch(`${shopifyBase}/products/${shopifyId}.json`, {
            method: 'PUT',
            headers: shopifyHeaders,
            body: JSON.stringify({ product: shopifyPayload }),
          })
          const shopifyData = await shopifyRes.json().catch(() => ({}))
          if (!shopifyRes.ok) {
            const errMsg = JSON.stringify((shopifyData as any).errors || shopifyData).slice(0, 200)
            throw new Error(`Shopify ${shopifyRes.status}: ${errMsg}`)
          }
        }

        // Update local DB
        if (Object.keys(dbUpdate).length > 0) {
          await supabase
            .from('shopify_products')
            .update({ ...dbUpdate, updated_at: new Date().toISOString() })
            .eq('id', product.id)
            .eq('user_id', user.id)
        }

        results.push({ id: product.id, success: true })
        successCount++

        // Rate-limit safety
        await new Promise(r => setTimeout(r, 200))

      } catch (err: any) {
        console.error('[bulk] Product', product.id, err.message)
        results.push({ id: product.id, error: err.message })
        errorCount++
      }
    }

    return NextResponse.json({
      success: true,
      message: `${successCount} produit(s) mis à jour${errorCount > 0 ? `, ${errorCount} erreur(s)` : ''}`,
      successCount,
      errorCount,
      results,
    })

  } catch (e: any) {
    console.error('[bulk/route]', e)
    return NextResponse.json({ error: e.message }, { status: 500 })
  }
}
