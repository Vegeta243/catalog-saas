export function detectPlatform(url: string): string {
  const u = url.toLowerCase()
  if (u.includes('aliexpress.com')) return 'aliexpress'
  if (u.includes('cjdropshipping.com')) return 'cjdropshipping'
  if (u.includes('alibaba.com')) return 'alibaba'
  if (u.includes('dhgate.com')) return 'dhgate'
  if (u.includes('banggood.com')) return 'banggood'
  if (u.includes('wiio.io') || u.includes('wiio.com')) return 'wiio'
  if (u.includes('autods.com')) return 'autods'
  if (u.includes('amazon.')) return 'amazon'
  if (u.includes('temu.com')) return 'temu'
  if (u.includes('shein.com')) return 'shein'
  return 'unknown'
}

export async function safeFetch(
  url: string,
  timeoutMs = 12000
): Promise<{ ok: boolean; html: string; status: number }> {
  try {
    const ctrl = new AbortController()
    const timer = setTimeout(() => ctrl.abort(), timeoutMs)
    const res = await fetch(url, {
      signal: ctrl.signal,
      headers: {
        'User-Agent':
          'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X)' +
          ' AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1',
        Accept: 'text/html,application/xhtml+xml,*/*;q=0.9',
        'Accept-Language': 'fr-FR,fr;q=0.9,en;q=0.8',
        'Cache-Control': 'no-cache',
      },
    })
    clearTimeout(timer)
    const html = await res.text()
    return { ok: res.ok, html, status: res.status }
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : 'fetch error'
    console.error('[safeFetch]', url.slice(0, 80), msg)
    return { ok: false, html: '', status: 0 }
  }
}

export function extractOgData(html: string): {
  title: string | null
  image: string | null
  description: string | null
  price: string | null
} {
  function getMeta(prop: string): string | null {
    const re1 = new RegExp(
      `<meta[^>]+property=["']${prop}["'][^>]+content=["']([^"']{1,500})["']`, 'i'
    )
    const re2 = new RegExp(
      `<meta[^>]+content=["']([^"']{1,500})["'][^>]+property=["']${prop}["']`, 'i'
    )
    const re3 = new RegExp(
      `<meta[^>]+name=["']${prop}["'][^>]+content=["']([^"']{1,500})["']`, 'i'
    )
    const re4 = new RegExp(
      `<meta[^>]+content=["']([^"']{1,500})["'][^>]+name=["']${prop}["']`, 'i'
    )
    for (const re of [re1, re2, re3, re4]) {
      const m = html.match(re)
      if (m?.[1]?.trim()) return m[1].trim()
    }
    return null
  }
  return {
    title: getMeta('og:title') || getMeta('twitter:title'),
    image: getMeta('og:image') || getMeta('twitter:image'),
    description: getMeta('og:description') || getMeta('description'),
    price: getMeta('product:price:amount'),
  }
}

export function cleanHtml(html: string): string {
  return html
    .replace(/<[^>]*>/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&nbsp;/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
}

export function extractPrice(text: string): number {
  const match = text.match(/[\d,]+\.?\d*/)?.[0]
  if (!match) return 0
  return parseFloat(match.replace(',', '')) || 0
}

export async function fetchWithRetry(
  url: string,
  options: RequestInit = {},
  retries = 3
): Promise<Response> {
  const headers = {
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
    'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
    'Accept-Language': 'fr-FR,fr;q=0.9,en-US;q=0.8,en;q=0.7',
    'Accept-Encoding': 'gzip, deflate, br',
    'Cache-Control': 'no-cache',
    ...options.headers,
  }

  for (let i = 0; i < retries; i++) {
    try {
      const res = await fetch(url, { ...options, headers })
      if (res.ok) return res
      if (res.status === 429) {
        await new Promise(r => setTimeout(r, 2000 * (i + 1)))
        continue
      }
      throw new Error(`HTTP ${res.status}`)
    } catch (e) {
      if (i === retries - 1) throw e
      await new Promise(r => setTimeout(r, 1000 * (i + 1)))
    }
  }
  throw new Error('Max retries exceeded')
}
