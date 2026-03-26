/**
 * /api/import/test/route.ts
 * Test endpoint to verify import system is working
 */

import { NextResponse } from 'next/server'
import { importProduct } from '@/lib/importers'
import { detectPlatform } from '@/lib/importers'

const TEST_URLS = [
  {
    name: 'AliExpress',
    url: 'https://www.aliexpress.com/item/1005006294704696.html',
    platform: 'aliexpress',
  },
  {
    name: 'Alibaba',
    url: 'https://www.alibaba.com/product-detail/Custom-Logo-Wireless-Bluetooth-Headphones_1600449829053.html',
    platform: 'alibaba',
  },
  {
    name: 'CJ Dropshipping',
    url: 'https://cjdropshipping.com/product/wireless-earbuds-p-123456.html',
    platform: 'cjdropshipping',
  },
]

export async function GET() {
  const results = []

  for (const test of TEST_URLS) {
    try {
      const detected = detectPlatform(test.url)
      const start = Date.now()
      const result = await importProduct(test.url)
      const duration = Date.now() - start

      results.push({
        platform: test.name,
        detected,
        success: result.success,
        duration: `${duration}ms`,
        hasProduct: !!result.product,
        title: result.product?.title?.substring(0, 50),
        error: result.error,
      })
    } catch (error) {
      results.push({
        platform: test.name,
        detected: detectPlatform(test.url),
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      })
    }
  }

  const allSuccess = results.every(r => r.success)

  return NextResponse.json({
    success: allSuccess,
    timestamp: new Date().toISOString(),
    results,
    summary: {
      total: results.length,
      successful: results.filter(r => r.success).length,
      failed: results.filter(r => !r.success).length,
    },
    message: allSuccess 
      ? '✅ Tous les tests ont réussi' 
      : '⚠️ Certains tests ont échoué - vérifiez les clés API et la connectivité',
  })
}

export async function POST(request: Request) {
  try {
    const { url } = await request.json()

    if (!url || typeof url !== 'string') {
      return NextResponse.json({ error: 'URL required' }, { status: 400 })
    }

    const platform = detectPlatform(url)
    const start = Date.now()
    const result = await importProduct(url)
    const duration = Date.now() - start

    return NextResponse.json({
      success: result.success,
      platform,
      duration: `${duration}ms`,
      result,
    })
  } catch (error) {
    return NextResponse.json({ 
      error: error instanceof Error ? error.message : 'Test failed',
      success: false,
    }, { status: 500 })
  }
}
