/**
 * /api/import/image-proxy/route.ts
 * Proxy images to avoid CORS issues and broken links
 */

import { NextRequest, NextResponse } from 'next/server'

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams
  const url = searchParams.get('url')

  if (!url) {
    return NextResponse.json({ error: 'URL manquante' }, { status: 400 })
  }

  // Validate URL
  if (!url.startsWith('http://') && !url.startsWith('https://')) {
    return NextResponse.json({ error: 'URL invalide' }, { status: 400 })
  }

  try {
    // Fetch image with proper headers
    const response = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
        'Accept': 'image/webp,image/apng,image/*,*/*;q=0.8',
      },
    })

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`)
    }

    // Get content type
    const contentType = response.headers.get('content-type') || 'image/jpeg'

    // Get image data
    const arrayBuffer = await response.arrayBuffer()
    const buffer = Buffer.from(arrayBuffer)

    // Return proxied image
    return new NextResponse(buffer, {
      headers: {
        'Content-Type': contentType,
        'Cache-Control': 'public, max-age=86400, immutable',
        'Access-Control-Allow-Origin': '*',
      },
    })
  } catch (error) {
    console.error('[ImageProxy] Error:', error)
    
    // Return placeholder image on error
    const placeholder = Buffer.from(
      'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==',
      'base64'
    )
    
    return new NextResponse(placeholder, {
      headers: {
        'Content-Type': 'image/png',
        'Cache-Control': 'public, max-age=3600',
      },
    })
  }
}
