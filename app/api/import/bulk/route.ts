import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createClient as createServiceClient } from '@supabase/supabase-js'
import { importProduct, detectPlatform } from '@/lib/importers'
import { shopifyQuery } from '@/lib/shopify-graphql'

function getAdminClient() {
  return createServiceClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )
}

const CREATE_PRODUCT_MUTATION = `
  mutation productCreate($input: ProductInput!) {
    productCreate(input: $input) {
      product {
        id
        title
        handle
      }
      userErrors {
        field
        message
      }
    }
  }
`

export async function POST(request: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ error: 'Non autorise' }, { status: 401 })
  }

  let body: { urls?: unknown; push_to_shopify?: boolean }
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Corps de requete invalide' }, { status: 400 })
  }

  const { urls, push_to_shopify = true } = body

  if (!urls || !Array.isArray(urls) || urls.length === 0) {
    return NextResponse.json({ error: 'Aucune URL fournie' }, { status: 400 })
  }

  if (urls.length > 50) {
    return NextResponse.json({ error: 'Maximum 50 URLs a la fois' }, { status: 400 })
  }

  // Get shop for Shopify push
  let shopDomain: string | null = null
  let shopToken: string | null = null

  if (push_to_shopify) {
    const { data: shop } = await supabase
      .from('shops')
      .select('shop_domain, access_token')
      .eq('user_id', user.id)
      .eq('is_active', true)
      .limit(1)
      .single()

    if (shop) {
      shopDomain = shop.shop_domain
      shopToken = shop.access_token
    }
  }

  const db = getAdminClient()

  // Create import job
  const { data: job } = await db
    .from('import_jobs')
    .insert({
      user_id: user.id,
      platform: detectPlatform(urls[0] as string),
      source_urls: urls,
      status: 'processing',
      total_products: urls.length,
    })
    .select()
    .single()

  // Process imports
  const results = []
  let importedCount = 0
  let failedCount = 0

  for (const url of urls as string[]) {
    const result = await importProduct(url)

    if (result.success && result.product) {
      const p = result.product
      let shopifyId: string | null = null

      // Push to Shopify if connected
      if (shopDomain && shopToken && push_to_shopify) {
        try {
          const shopifyResult = await shopifyQuery<{
            productCreate: { product: { id: string } | null; userErrors: { message: string }[] }
          }>(
            shopDomain,
            shopToken,
            CREATE_PRODUCT_MUTATION,
            {
              input: {
                title: p.title,
                descriptionHtml: p.description,
                vendor: p.vendor,
                tags: p.tags,
                images: p.images.slice(0, 5).map(src => ({ src })),
                variants: p.variants.map(v => ({
                  price: v.price.toFixed(2),
                  compareAtPrice: p.compareAtPrice?.toFixed(2),
                  sku: v.sku,
                  inventoryManagement: 'SHOPIFY',
                  inventoryPolicy: 'DENY',
                })),
              },
            }
          )
          shopifyId = shopifyResult?.productCreate?.product?.id ?? null
        } catch (shopifyError: unknown) {
          const msg = shopifyError instanceof Error ? shopifyError.message : String(shopifyError)
          console.error('[Import] Shopify push error:', msg)
        }
      }

      results.push({
        url,
        success: true,
        title: p.title,
        price: p.price,
        image: p.images?.[0] || null,
        images: p.images.length,
        shopify_id: shopifyId,
        platform: p.platform,
      })
      importedCount++
    } else {
      results.push({
        url,
        success: false,
        error: result.error,
      })
      failedCount++
    }

    // Small delay to avoid hammering
    await new Promise(r => setTimeout(r, 200))
  }

  // Update job
  if (job?.id) {
    await db.from('import_jobs').update({
      status: failedCount === urls.length ? 'failed' : 'completed',
      imported_count: importedCount,
      failed_count: failedCount,
      results,
      updated_at: new Date().toISOString(),
    }).eq('id', job.id)
  }

  return NextResponse.json({
    success: true,
    job_id: job?.id,
    total: urls.length,
    imported: importedCount,
    failed: failedCount,
    results,
  })
}
