/**
 * /api/import/from-file/route.ts
 * Import products from CSV or TXT file
 * Supports: CSV, TXT (one URL per line)
 */

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { importProducts } from '@/lib/importers'

export const maxDuration = 120

interface ParsedFile {
  urls: string[]
  format: 'csv' | 'txt'
  totalLines: number
  validLines: number
}

function parseFileContent(content: string, type: string): ParsedFile {
  const lines = content.split(/\r?\n/)
  const urls: string[] = []
  
  if (type.includes('csv')) {
    // CSV: extract URLs from any column
    for (const line of lines) {
      const urlMatch = line.match(/https?:\/\/[^\s,;]+/i)
      if (urlMatch) {
        urls.push(urlMatch[0])
      }
    }
    return {
      urls,
      format: 'csv',
      totalLines: lines.length,
      validLines: urls.length,
    }
  } else {
    // TXT: one URL per line
    for (const line of lines) {
      const trimmed = line.trim()
      if (trimmed.startsWith('http')) {
        urls.push(trimmed)
      }
    }
    return {
      urls,
      format: 'txt',
      totalLines: lines.length,
      validLines: urls.length,
    }
  }
}

export async function POST(request: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })
  }

  try {
    const formData = await request.formData()
    const file = formData.get('file') as File | null
    const pushToShopify = formData.get('push_to_shopify') === 'true'
    const autoRetry = formData.get('auto_retry') === 'true'
    const margin = parseFloat(formData.get('margin') as string) || 1.5

    if (!file) {
      return NextResponse.json({ error: 'Aucun fichier fourni' }, { status: 400 })
    }

    // Validate file type
    const fileType = file.type
    const fileName = file.name.toLowerCase()
    const isCSV = fileType.includes('csv') || fileName.endsWith('.csv')
    const isTXT = fileType.includes('text') || fileName.endsWith('.txt')

    if (!isCSV && !isTXT) {
      return NextResponse.json({ 
        error: 'Format non supporté. Utilisez CSV ou TXT.',
        accepted: ['.csv', '.txt'],
        received: fileType || 'unknown',
      }, { status: 400 })
    }

    // Read file content
    const content = await file.text()
    const parsed = parseFileContent(content, fileType)

    if (parsed.urls.length === 0) {
      return NextResponse.json({ 
        error: 'Aucune URL valide trouvée dans le fichier',
        totalLines: parsed.totalLines,
      }, { status: 400 })
    }

    if (parsed.urls.length > 100) {
      return NextResponse.json({ 
        error: 'Maximum 100 URLs par fichier',
        provided: parsed.urls.length,
        suggestion: 'Divisez votre fichier en plusieurs parties',
      }, { status: 400 })
    }

    // Get user's shop for Shopify push
    let shopDomain: string | null = null
    let shopToken: string | null = null

    if (pushToShopify) {
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

    // Process imports
    const results = await importProducts(parsed.urls, {
      concurrency: 5,
      retryFailed: autoRetry,
      maxRetries: 3,
    })

    // Format results
    const formattedResults = results.map(result => ({
      url: result.url,
      success: result.success,
      title: result.product?.title,
      price: result.product?.price,
      platform: result.product?.platform,
      error: result.error,
    }))

    const imported = results.filter(r => r.success).length
    const failed = results.filter(r => !r.success).length

    return NextResponse.json({
      success: true,
      file: {
        name: file.name,
        format: parsed.format,
        totalLines: parsed.totalLines,
        validUrls: parsed.urls.length,
      },
      results: formattedResults,
      stats: {
        imported,
        failed,
        successRate: Math.round((imported / results.length) * 100),
      },
      message: `${imported} produit(s) importé(s) avec succès`,
    })
  } catch (error) {
    console.error('[ImportFromFile] Error:', error)
    return NextResponse.json({ 
      error: error instanceof Error ? error.message : 'Erreur lors de l\'import',
    }, { status: 500 })
  }
}

export async function GET() {
  return NextResponse.json({
    message: 'Endpoint d\'import depuis fichier',
    usage: 'POST avec FormData: file (CSV ou TXT)',
    acceptedFormats: ['.csv', '.txt'],
    maxUrls: 100,
    example: {
      csv: 'url,title,price\nhttps://aliexpress.com/item/...,Product,9.99',
      txt: 'https://aliexpress.com/item/...\nhttps://cjdropshipping.com/product/...',
    },
  })
}
