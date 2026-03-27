import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export const maxDuration = 30

export async function POST() {
  try {
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

    // Fetch all products via REST API with pagination
    const allProducts: unknown[] = []
    let pageInfo: string | null = null

    do {
      const url: string = pageInfo
        ? `https://${shop.shop_domain}/admin/api/2024-01/products.json?limit=250&page_info=${pageInfo}`
        : `https://${shop.shop_domain}/admin/api/2024-01/products.json?limit=250`

      const res: Response = await fetch(url, {
        headers: { 'X-Shopify-Access-Token': shop.access_token },
      })

      if (!res.ok) {
        return NextResponse.json({ error: 'Erreur lors de la synchronisation Shopify' }, { status: res.status })
      }

      const data = await res.json()
      allProducts.push(...(data.products || []))

      // Extract next page cursor from Link header
      const linkHeader: string = res.headers.get('Link') || ''
      const nextMatch: RegExpMatchArray | null = linkHeader.match(/<[^>]*page_info=([^&>]+)[^>]*>;\s*rel="next"/)
      pageInfo = nextMatch ? nextMatch[1] : null
    } while (pageInfo)

    return NextResponse.json({
      success: true,
      total: allProducts.length,
      shop: shop.shop_domain,
      products: allProducts,
    })
  } catch (error) {
    console.error('POST /api/shopify/sync:', error)
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })
  }
}

export async function GET() {
  // Alias: same as POST for convenience
  return POST()
}
