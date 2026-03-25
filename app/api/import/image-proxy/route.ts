import { NextRequest, NextResponse } from 'next/server'

const ALLOWED = [
  'alicdn.com', 'aliexpress.com', 'ae01.alicdn.com',
  'ae02.alicdn.com', 'ae03.alicdn.com', 's.alicdn.com',
  'cjdropshipping.com', 'cjimg.net',
  'dhresource.com', 'dhgate.com',
  'banggood.com', 'bgstatic.com', 'staticbg.com',
  'alibaba.com', 'alibabagroup.com',
]

export async function GET(request: NextRequest) {
  const url = request.nextUrl.searchParams.get('url')
  if (!url) return new NextResponse('Missing url', { status: 400 })

  let allowed = false
  try {
    const h = new URL(url).hostname
    allowed = ALLOWED.some(d => h.includes(d))
  } catch {
    return new NextResponse('Invalid URL', { status: 400 })
  }
  if (!allowed) return new NextResponse('Domain not allowed', { status: 403 })

  try {
    const ctrl = new AbortController()
    const t = setTimeout(() => ctrl.abort(), 10000)
    const res = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (compatible; Googlebot/2.1)',
        'Referer': 'https://www.aliexpress.com/',
        'Accept': 'image/avif,image/webp,image/apng,image/*,*/*;q=0.8',
      },
      signal: ctrl.signal,
    })
    clearTimeout(t)
    if (!res.ok) {
      return new NextResponse(null, { status: res.status })
    }
    const buf = await res.arrayBuffer()
    const ct = res.headers.get('content-type') || 'image/jpeg'
    return new NextResponse(buf, {
      headers: {
        'Content-Type': ct,
        'Cache-Control': 'public, max-age=86400',
        'Access-Control-Allow-Origin': '*',
      }
    })
  } catch {
    return new NextResponse(null, { status: 502 })
  }
}
