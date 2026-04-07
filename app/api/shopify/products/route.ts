import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export const maxDuration = 30

const cacheHeaders = {
  'Cache-Control': 'private, s-maxage=60, stale-while-revalidate=300',
}

export async function GET(request: NextRequest) {
  const supabase = await createClient()
  const {
    data: { user },
    error: authErr,
  } = await supabase.auth.getUser()

  if (authErr || !user) {
    return NextResponse.json({ error: 'Non autorise' }, { status: 401 })
  }

  const { searchParams } = new URL(request.url)
  const limit = Math.min(parseInt(searchParams.get('limit') || '50', 10), 250)
  const page = Math.max(1, parseInt(searchParams.get('page') || '1', 10))
  const search = (searchParams.get('search') || '').trim()
  const offset = (page - 1) * limit

  try {
    // Read user's active shop domain for filtering
    let activeShopDomain: string | null = null
    try {
      const { data: userRow } = await supabase
        .from('users')
        .select('active_shop_domain')
        .eq('id', user.id)
        .single()
      activeShopDomain = userRow?.active_shop_domain ?? null
    } catch { /* column may not exist yet */ }

    let q = supabase
      .from('shopify_products')
      .select('*', { count: 'exact' })
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1)

    if (activeShopDomain) {
      q = q.eq('shop_domain', activeShopDomain)
    }

    if (search) {
      q = q.ilike('title', `%${search}%`)
    }

    const { data, count, error } = await q
    if (!error && data !== null) {
      const products = (data || []).map((p: any) => ({
        ...p,
        images: Array.isArray(p.images) ? p.images : [],
        variants: Array.isArray(p.variants) ? p.variants : [],
      }))

      return NextResponse.json({
        products,
        total: count ?? products.length,
        source: 'cache',
      }, { headers: cacheHeaders })
    }
  } catch (cacheErr: any) {
    console.warn('[products] cache error:', cacheErr.message)
  }

  // Read active shop domain for Shopify API fallback
  let activeShopDomainFallback: string | null = null
  try {
    const { data: userRow } = await supabase
      .from('users')
      .select('active_shop_domain')
      .eq('id', user.id)
      .single()
    activeShopDomainFallback = userRow?.active_shop_domain ?? null
  } catch { /* ignore */ }

  const shopQuery = supabase
    .from('shops')
    .select('*')
    .eq('user_id', user.id)
    .eq('is_active', true)
  const { data: shops } = activeShopDomainFallback
    ? await shopQuery.eq('shop_domain', activeShopDomainFallback).limit(1)
    : await shopQuery.limit(1)

  const shop = shops?.[0] as Record<string, unknown> | undefined
  if (!shop) {
    return NextResponse.json({ products: [], total: 0, source: 'none' }, { headers: cacheHeaders })
  }

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
    return NextResponse.json({ products: [], total: 0, source: 'none' }, { headers: cacheHeaders })
  }

  const params = new URLSearchParams({
    limit: String(limit),
    fields: 'id,title,body_html,vendor,tags,status,variants,images,created_at',
  })
  if (search) {
    params.set('title', search)
  }

  const res = await fetch(`https://${shopDomain}/admin/api/2024-01/products.json?${params}`, {
    headers: { 'X-Shopify-Access-Token': accessToken },
    cache: 'no-store',
  })

  if (!res.ok) {
    return NextResponse.json({ error: `Shopify ${res.status}` }, { status: 502 })
  }

  const json = await res.json()
  const products = (json.products || []).map((p: any) => ({
    id: String(p.id),
    shopify_product_id: String(p.id),
    title: p.title || '',
    body_html: p.body_html || '',
    description: p.body_html || '',
    vendor: p.vendor || '',
    tags: p.tags || '',
    status: p.status || 'active',
    price: parseFloat(p.variants?.[0]?.price || '0') || 0,
    compare_at_price:
      p.variants?.[0]?.compare_at_price === null ||
      p.variants?.[0]?.compare_at_price === undefined ||
      p.variants?.[0]?.compare_at_price === ''
        ? null
        : parseFloat(p.variants?.[0]?.compare_at_price || '0') || null,
    images: (p.images || [])
      .map((img: any) => (typeof img === 'string' ? img : img?.src))
      .filter(Boolean),
    variants: p.variants || [],
    created_at: p.created_at,
  }))

  let total = products.length
  try {
    const cr = await fetch(`https://${shopDomain}/admin/api/2024-01/products/count.json`, {
      headers: { 'X-Shopify-Access-Token': accessToken },
      cache: 'no-store',
    })
    if (cr.ok) {
      total = (await cr.json()).count || total
    }
  } catch {
    // Keep fallback total if count request fails.
  }

  return NextResponse.json({ products, total, source: 'live' }, { headers: cacheHeaders })
}
