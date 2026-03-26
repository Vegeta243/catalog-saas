/**
 * /api/import/bulk/route.ts
 * Enhanced bulk import endpoint with parallel processing, retry logic, and real-time progress
 * Supports up to 100 URLs per batch with automatic retry for failed imports
 */

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createClient as createServiceClient } from '@supabase/supabase-js'
import { importProducts, validateImportUrls, getImportStats, groupUrlsByPlatform } from '@/lib/importers'
import type { ImportResult } from '@/lib/importers'

export const maxDuration = 120 // 2 minutes timeout for large batches

const CREATE_PRODUCT_MUTATION = `
  mutation productCreate($input: ProductInput!) {
    productCreate(input: $input) {
      product {
        id
        title
        handle
        images(first: 1) {
          nodes {
            src
          }
        }
      }
      userErrors {
        field
        message
      }
    }
  }
`

function getAdminClient() {
  return createServiceClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )
}

async function pushToShopify(
  shopDomain: string,
  shopToken: string,
  product: ImportResult['product']
): Promise<{ success: boolean; shopifyId?: string; error?: string }> {
  if (!product) return { success: false, error: 'No product data' }

  try {
    const shopifyUrl = `https://${shopDomain}/admin/api/2024-01/graphql.json`
    
    const response = await fetch(shopifyUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Shopify-Access-Token': shopToken,
      },
      body: JSON.stringify({
        query: CREATE_PRODUCT_MUTATION,
        variables: {
          input: {
            title: product.title,
            descriptionHtml: product.description,
            vendor: product.vendor,
            tags: product.tags.join(', '),
            images: product.images.slice(0, 5).map(src => ({ src })),
            variants: product.variants.map(v => ({
              price: v.price.toFixed(2),
              compareAtPrice: product.compareAtPrice?.toFixed(2),
              sku: v.sku,
              inventoryManagement: 'SHOPIFY',
              inventoryPolicy: 'DENY',
            })),
          },
        },
      }),
    })

    if (!response.ok) {
      const error = await response.text()
      return { success: false, error }
    }

    const data = await response.json()
    const shopifyProduct = data.data?.productCreate?.product
    
    if (shopifyProduct) {
      return { success: true, shopifyId: shopifyProduct.id }
    }

    const userErrors = data.data?.productCreate?.userErrors
    if (userErrors?.length > 0) {
      return { success: false, error: userErrors[0].message }
    }

    return { success: false, error: 'Unknown Shopify error' }
  } catch (error) {
    return { 
      success: false, 
      error: error instanceof Error ? error.message : 'Shopify connection error' 
    }
  }
}

export async function POST(request: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })
  }

  let body: { 
    urls?: unknown
    push_to_shopify?: boolean
    auto_retry?: boolean
    margin?: number
  }
  
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Corps de requête invalide' }, { status: 400 })
  }

  const { 
    urls, 
    push_to_shopify = true, 
    auto_retry = true,
    margin = 1.5,
  } = body

  if (!urls || !Array.isArray(urls) || urls.length === 0) {
    return NextResponse.json({ error: 'Aucune URL fournie' }, { status: 400 })
  }

  if (urls.length > 100) {
    return NextResponse.json({ 
      error: 'Maximum 100 URLs par lot. Divisez votre import en plusieurs batches.',
      max_allowed: 100,
      provided: urls.length,
    }, { status: 400 })
  }

  // Validate URLs
  const validated = validateImportUrls(urls as string[])
  const validUrls = validated.filter(u => u.valid).map(u => u.url)
  const invalidUrls = validated.filter(u => !u.valid)

  if (validUrls.length === 0) {
    return NextResponse.json({ 
      error: 'Aucune URL valide trouvée',
      invalid: invalidUrls.map(u => ({ url: u.url, reason: 'Format invalide' })),
    }, { status: 400 })
  }

  // Get user's shop for Shopify push
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

  // Group URLs by platform for optimized processing
  const grouped = groupUrlsByPlatform(validUrls)
  
  // Create import job
  const { data: job, error: jobError } = await db
    .from('import_jobs')
    .insert({
      user_id: user.id,
      platform: Object.keys(grouped)[0] || 'mixed',
      source_urls: validUrls,
      status: 'processing',
      total_products: validUrls.length,
      imported_count: 0,
      failed_count: 0,
      retry_count: 0,
      max_retries: auto_retry ? 3 : 0,
      results: [],
      error_details: invalidUrls.map(u => ({ url: u.url, error: 'URL invalide' })),
    })
    .select()
    .single()

  if (jobError || !job) {
    console.error('[Import] Failed to create job:', jobError)
    // Continue without job tracking
  }

  // Process imports with parallel execution and retry
  let importedCount = 0
  let failedCount = 0
  const results: Array<{
    url: string
    success: boolean
    title?: string
    price?: number
    image?: string
    images?: number
    shopify_id?: string
    platform?: string
    error?: string
  }> = []

  const invalidResults = invalidUrls.map(u => ({
    url: u.url,
    success: false as const,
    error: 'URL invalide ou format non supporté',
  }))
  results.push(...invalidResults)

  try {
    const importResults = await importProducts(validUrls, {
      concurrency: 5, // Process 5 URLs in parallel
      retryFailed: auto_retry,
      maxRetries: 3,
      onProgress: (done, total, currentResults) => {
        console.log(`[Import] Progress: ${done}/${total}`)

        // Update job progress in database (fire and forget)
        if (job?.id) {
          void (async () => {
            try {
              await db.from('import_jobs')
                .update({
                  status: 'processing',
                  imported_count: currentResults.filter(r => r.success).length,
                  failed_count: currentResults.filter(r => !r.success).length,
                  results: currentResults.map(r => ({
                    url: r.url,
                    success: r.success,
                    title: r.product?.title,
                    platform: r.product?.platform,
                  })) as never[],
                  updated_at: new Date().toISOString(),
                })
                .eq('id', job.id)
            } catch {
              // Ignore errors - don't block progress
            }
          })()
        }
      },
    })

    // Process results and push to Shopify
    for (const result of importResults) {
      let shopifyId: string | null = null
      let shopifyError: string | undefined

      // Push to Shopify if connected and import successful
      if (result.success && result.product && shopDomain && shopToken && push_to_shopify) {
        const shopifyResult = await pushToShopify(shopDomain, shopToken, result.product)
        
        if (shopifyResult.success) {
          shopifyId = shopifyResult.shopifyId || null
        } else {
          shopifyError = shopifyResult.error
          console.error('[Import] Shopify push error:', shopifyError)
        }
      }

      if (result.success && result.product) {
        const product = result.product // TypeScript knows this is defined here
        
        results.push({
          url: result.url,
          success: true,
          title: product.title,
          price: product.price,
          image: product.images?.[0] || undefined,
          images: product.images?.length || 0,
          shopify_id: shopifyId || undefined,
          platform: product.platform,
          error: shopifyError,
        })
        importedCount++

        // Save to import history (fire and forget)
        void (async () => {
          try {
            await db.from('import_history').insert({
              user_id: user.id,
              shop_id: shopDomain ? undefined : null,
              source_url: result.url,
              product_title: product.title,
              shopify_id: shopifyId,
              supplier_price: product.price,
              selling_price: Math.round(product.price * margin * 100) / 100,
              status: 'imported',
            })
          } catch {
            // Ignore errors
          }
        })()
      } else {
        results.push({
          url: result.url,
          success: false,
          error: result.error || 'Échec de l\'import',
        })
        failedCount++
      }
    }
  } catch (error) {
    console.error('[Import] Batch processing error:', error)
  }

  // Update job final status
  if (job?.id) {
    const finalStatus = failedCount === validUrls.length ? 'failed' : 
                        failedCount > 0 ? 'partial' : 'completed'
    
    await db.from('import_jobs').update({
      status: finalStatus,
      imported_count: importedCount,
      failed_count: failedCount,
      results: results as never[],
      completed_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    }).eq('id', job.id)
  }

  const stats = getImportStats(results as ImportResult[])

  return NextResponse.json({
    success: true,
    job_id: job?.id,
    total: validUrls.length,
    imported: importedCount,
    failed: failedCount,
    invalid: invalidUrls.length,
    results,
    stats: {
      total: stats.total,
      successful: stats.successful,
      failed: stats.failed,
      success_rate: Math.round(stats.successRate),
      platforms: stats.platforms,
    },
    shopify_pushed: results.filter(r => r.shopify_id).length,
    message: importedCount > 0 
      ? `${importedCount} produit(s) importé(s) avec succès`
      : failedCount > 0 
        ? `Échec de l'import. Vérifiez les URLs et réessayez.`
        : 'Aucun produit à importer',
  })
}
