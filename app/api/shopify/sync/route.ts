import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export const maxDuration = 60

type ShopRecord = {
  shop_domain: string
  access_token: string
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

export async function POST(_request: NextRequest) {
  try {
    const supabase = await createClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })
    }

    const shop = await getActiveShop(supabase, user.id)
    if (!shop) {
      return NextResponse.json({ error: 'Aucune boutique Shopify connectée' }, { status: 400 })
    }

    let allProducts: any[] = []
    let nextUrl: string | null = `https://${shop.shop_domain}/admin/api/2024-01/products.json?limit=250&fields=id,title,body_html,vendor,product_type,tags,status,variants,images,created_at,updated_at`

    while (nextUrl) {
      const res: Response = await fetch(nextUrl, {
        headers: { 'X-Shopify-Access-Token': shop.access_token },
      })

      if (!res.ok) {
        const details = await res.text()
        console.error('[sync] Shopify API error:', res.status, details)
        return NextResponse.json({ error: `Shopify API error: ${res.status}` }, { status: 502 })
      }

      const data = await res.json()
      allProducts = allProducts.concat(data.products || [])

      const link: string = res.headers.get('Link') || ''
      const nextMatch: RegExpMatchArray | null = link.match(/<([^>]+)>;\s*rel="next"/)
      nextUrl = nextMatch ? nextMatch[1] : null
    }

    const toUpsert = allProducts.map((p: any) => ({
      shopify_product_id: String(p.id),
      user_id: user.id,
      shop_domain: shop.shop_domain,
      title: p.title || '',
      body_html: p.body_html || '',
      description: p.body_html || '',
      vendor: p.vendor || '',
      product_type: p.product_type || '',
      tags: typeof p.tags === 'string' ? p.tags : '',
      status: p.status || 'active',
      price: parseFloat(p.variants?.[0]?.price || '0') || 0,
      compare_at_price: parseFloat(p.variants?.[0]?.compare_at_price || '0') || null,
      images: JSON.stringify((p.images || []).map((img: any) => img.src)),
      variants: JSON.stringify(p.variants || []),
      synced_at: new Date().toISOString(),
      updated_at: p.updated_at || new Date().toISOString(),
    }))

    let synced = 0
    let cacheEnabled = true

    for (let i = 0; i < toUpsert.length; i += 100) {
      const chunk = toUpsert.slice(i, i + 100)
      const { error } = await supabase
        .from('shopify_products')
        .upsert(chunk, { onConflict: 'shopify_product_id,user_id' })

      if (error) {
        // If table is missing or constraint is absent, continue without failing sync.
        cacheEnabled = false
        const message = (error as any)?.message || ''
        if (message.includes('relation') || message.includes('does not exist') || message.includes('constraint')) {
          break
        }
      } else {
        synced += chunk.length
      }
    }

    return NextResponse.json({
      success: true,
      total: allProducts.length,
      synced: cacheEnabled ? synced : 0,
      cacheEnabled,
      shop: shop.shop_domain,
    })
  } catch (e: any) {
    console.error('[sync]', e?.message || e)
    return NextResponse.json({ error: e?.message || 'Erreur serveur' }, { status: 500 })
  }
}

export async function GET(request: NextRequest) {
  return POST(request)
}
