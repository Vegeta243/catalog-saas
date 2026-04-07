import { NextRequest, NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { createClient } from '@/lib/supabase/server'

export const maxDuration = 60

export async function POST(_request: NextRequest) {
  const supabase = await createClient()

  const {
    data: { user },
    error: authErr,
  } = await supabase.auth.getUser()

  if (authErr || !user) {
    return NextResponse.json({ error: 'Non autorise' }, { status: 401 })
  }

  // Read active shop domain from cookie
  const cookieStore = await cookies()
  const activeShopDomain = cookieStore.get('active_shop_domain')?.value || null

  let shopBaseQuery = supabase
    .from('shops')
    .select('*')
    .eq('user_id', user.id)
    .eq('is_active', true)

  if (activeShopDomain) {
    shopBaseQuery = shopBaseQuery.eq('shop_domain', activeShopDomain)
  }

  const { data: shops, error: shopErr } = await shopBaseQuery.limit(1)

  console.log('[SYNC] Using shop:', shops?.[0]?.shop_domain, '(active cookie:', activeShopDomain, ')')

  if (shopErr) {
    console.error('[sync] shop query error:', shopErr.message)
    return NextResponse.json({ error: `Erreur DB: ${shopErr.message}` }, { status: 500 })
  }

  if (!shops || shops.length === 0) {
    return NextResponse.json(
      { error: 'Aucune boutique Shopify connectee. Connectez une boutique dans Mes boutiques.' },
      { status: 400 }
    )
  }

  const shop = shops[0] as Record<string, unknown>
  const shopDomain =
    (typeof shop.shop_domain === 'string' && shop.shop_domain) ||
    (typeof shop.domain === 'string' && shop.domain) ||
    (typeof shop.shopify_domain === 'string' && shop.shopify_domain) ||
    ''

  const accessToken =
    (typeof shop.access_token === 'string' && shop.access_token) ||
    (typeof shop.token === 'string' && shop.token) ||
    (typeof shop.shopify_token === 'string' && shop.shopify_token) ||
    ''

  if (!shopDomain || !accessToken) {
    console.error('[sync] missing domain or token:', {
      shopDomain: Boolean(shopDomain),
      accessToken: Boolean(accessToken),
    })
    return NextResponse.json(
      { error: 'Donnees boutique incompletes (domaine ou token manquant)' },
      { status: 400 }
    )
  }

  let allProducts: any[] = []
  let nextUrl: string | null = `https://${shopDomain}/admin/api/2024-01/products.json?limit=250&fields=id,title,body_html,vendor,product_type,handle,tags,status,variants,images,created_at,updated_at`

  let pageCount = 0
  while (nextUrl && pageCount < 20) {
    const res: Response = await fetch(nextUrl, {
      headers: { 'X-Shopify-Access-Token': accessToken },
      cache: 'no-store',
    })

    if (!res.ok) {
      const errText = await res.text()
      console.error('[sync] Shopify fetch error:', res.status, errText.slice(0, 200))
      return NextResponse.json(
        { error: `Erreur Shopify API: ${res.status}. Verifiez que la boutique est bien connectee.` },
        { status: 502 }
      )
    }

    const data = await res.json()
    const products = data.products || []
    allProducts = [...allProducts, ...products]

    const link: string = res.headers.get('Link') || ''
    const nextMatch: RegExpMatchArray | null = link.match(/<([^>]+)>;\s*rel="next"/)
    nextUrl = nextMatch ? nextMatch[1] : null
    pageCount += 1
  }

  if (allProducts.length === 0) {
    return NextResponse.json({
      success: true,
      total: 0,
      synced: 0,
      failed: 0,
      shop: shopDomain,
      message: 'Boutique connectee mais aucun produit trouve.',
    })
  }

  const rows = allProducts.map((p: any) => {
    const price = parseFloat(p.variants?.[0]?.price || '0') || 0
    const compareAtRaw = p.variants?.[0]?.compare_at_price
    const compareAt =
      compareAtRaw === null || compareAtRaw === undefined || compareAtRaw === ''
        ? null
        : parseFloat(compareAtRaw) || null
    const images = (p.images || [])
      .map((img: any) => (typeof img === 'string' ? img : img?.src))
      .filter(Boolean)

    return {
      shopify_product_id: String(p.id),
      user_id: user.id,
      shop_domain: shopDomain,
      title: p.title || '',
      body_html: p.body_html || '',
      vendor: p.vendor || '',
      product_type: p.product_type || '',
      handle: p.handle || '',
      tags: Array.isArray(p.tags) ? p.tags.join(',') : (p.tags || ''),
      status: p.status || 'active',
      price,
      compare_at_price: compareAt,
      images,
      variants: p.variants || [],
      synced_at: new Date().toISOString(),
    }
  })

  let synced = 0
  let failed = 0

  for (let i = 0; i < rows.length; i += 100) {
    const chunk = rows.slice(i, i + 100)
    const { error: upsertErr } = await supabase.from('shopify_products').upsert(chunk, {
      onConflict: 'shopify_product_id,user_id',
      ignoreDuplicates: false,
    })

    if (upsertErr) {
      console.error('[sync] upsert error:', upsertErr.message)
      failed += chunk.length
    } else {
      synced += chunk.length
    }
  }

  return NextResponse.json({
    success: true,
    total: allProducts.length,
    synced,
    failed,
    shop: shopDomain,
  })
}

export async function GET(request: NextRequest) {
  return POST(request)
}
