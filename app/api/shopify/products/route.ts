import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export const maxDuration = 30

type ShopRecord = {
  shop_domain: string
  access_token: string
}

function normalizeCachedRow(row: any) {
  const parsedImages = Array.isArray(row.images)
    ? row.images
    : typeof row.images === 'string'
      ? JSON.parse(row.images || '[]')
      : []
  const parsedVariants = Array.isArray(row.variants)
    ? row.variants
    : typeof row.variants === 'string'
      ? JSON.parse(row.variants || '[]')
      : []

  return {
    ...row,
    id: String(row.shopify_product_id || row.id || ''),
    body_html: row.body_html || row.description || '',
    images: parsedImages.map((src: string) => ({ src })),
    variants: parsedVariants,
    price: parsedVariants?.[0]?.price || String(row.price ?? '0'),
  }
}

function normalizeShopifyProduct(p: any, userId: string, shopDomain: string) {
  return {
    id: String(p.id),
    shopify_product_id: String(p.id),
    user_id: userId,
    shop_domain: shopDomain,
    title: p.title || '',
    body_html: p.body_html || '',
    description: p.body_html || '',
    vendor: p.vendor || '',
    product_type: p.product_type || '',
    tags: p.tags || '',
    status: p.status || 'active',
    price: parseFloat(p.variants?.[0]?.price || '0') || 0,
    compare_at_price: parseFloat(p.variants?.[0]?.compare_at_price || '0') || null,
    images: (p.images || []).map((img: any) => ({ src: img.src })),
    variants: p.variants || [],
    created_at: p.created_at,
    updated_at: p.updated_at,
  }
}

async function getActiveShop(supabase: any, userId: string): Promise<ShopRecord | null> {
  const { data } = await supabase
    .from('shops')
    .select('shop_domain, access_token')
    .eq('user_id', userId)
    .eq('is_active', true)
    .single()

  if (!data?.shop_domain || !data?.access_token) {
    return null
  }
  return data
}

export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const limit = Math.min(parseInt(searchParams.get('limit') || '50', 10), 250)
    const search = (searchParams.get('search') || '').trim()
    const page = Math.max(parseInt(searchParams.get('page') || '1', 10), 1)

    // Try cache table first. If table does not exist, Supabase returns an error and we fallback.
    try {
      let query = supabase
        .from('shopify_products')
        .select('*', { count: 'exact' })
        .eq('user_id', user.id)
        .order('updated_at', { ascending: false })
        .range((page - 1) * limit, page * limit - 1)

      if (search) {
        query = query.ilike('title', `%${search}%`)
      }

      const { data: cached, count, error } = await query
      if (!error && cached && cached.length > 0) {
        return NextResponse.json({
          products: cached.map(normalizeCachedRow),
          total: count || cached.length,
          source: 'cache',
        })
      }
    } catch {
      // continue with live Shopify fallback
    }

    const shop = await getActiveShop(supabase, user.id)
    if (!shop) {
      return NextResponse.json({ products: [], total: 0, source: 'none' })
    }

    const params = new URLSearchParams({
      limit: String(limit),
      fields: 'id,title,body_html,vendor,product_type,tags,status,variants,images,created_at,updated_at',
    })
    if (search) {
      params.set('title', search)
    }

    const res = await fetch(
      `https://${shop.shop_domain}/admin/api/2024-01/products.json?${params.toString()}`,
      {
        headers: { 'X-Shopify-Access-Token': shop.access_token },
      }
    )

    if (!res.ok) {
      const err = await res.text()
      console.error('[products] Shopify error:', res.status, err)
      return NextResponse.json({ error: `Erreur Shopify: ${res.status}` }, { status: 502 })
    }

    const data = await res.json()
    const products = (data.products || []).map((p: any) => normalizeShopifyProduct(p, user.id, shop.shop_domain))

    let total = products.length
    try {
      const countRes = await fetch(`https://${shop.shop_domain}/admin/api/2024-01/products/count.json`, {
        headers: { 'X-Shopify-Access-Token': shop.access_token },
      })
      if (countRes.ok) {
        const countData = await countRes.json()
        total = countData.count || total
      }
    } catch {
      // keep current total fallback
    }

    return NextResponse.json({ products, total, source: 'shopify' })
  } catch (e: any) {
    console.error('[products GET]', e?.message || e)
    return NextResponse.json({ error: e?.message || 'Erreur serveur' }, { status: 500 })
  }
}
