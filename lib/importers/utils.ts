export function detectPlatform(url: string): string {
  const u = url.toLowerCase()
  if (u.includes('aliexpress.com')) return 'aliexpress'
  if (u.includes('cjdropshipping.com')) return 'cjdropshipping'
  if (u.includes('dhgate.com')) return 'dhgate'
  if (u.includes('alibaba.com')) return 'alibaba'
  if (u.includes('banggood.com')) return 'banggood'
  if (u.includes('temu.com')) return 'temu'
  return 'unknown'
}

export function cleanHtml(html: string): string {
  return html
    .replace(/<[^>]*>/g, ' ')
    .replace(/&amp;/g, '&').replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>').replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'").replace(/&nbsp;/g, ' ')
    .replace(/\s+/g, ' ').trim().slice(0, 1000)
}

export function extractPrice(text: string): number {
  const m = text.replace(/,/g, '.').match(/(\d+\.?\d*)/)
  if (!m) return 0
  const v = parseFloat(m[1])
  return v > 0 && v < 100000 ? v : 0
}

export async function safeFetch(
  url: string,
  ms = 15000,
  extraHeaders?: Record<string, string>
): Promise<{ ok: boolean; html: string; status: number }> {
  try {
    const ctrl = new AbortController()
    const t = setTimeout(() => ctrl.abort(), ms)
    const res = await fetch(url, {
      signal: ctrl.signal,
      headers: {
        'User-Agent': 'Mozilla/5.0 (iPhone; CPU iPhone OS 16_6 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/16.6 Mobile/15E148 Safari/604.1',
        'Accept': 'text/html,application/xhtml+xml,*/*;q=0.8',
        'Accept-Language': 'fr-FR,fr;q=0.9',
        'Cache-Control': 'no-cache',
        ...extraHeaders,
      },
    })
    clearTimeout(t)
    const html = await res.text()
    return { ok: res.ok, html, status: res.status }
  } catch {
    return { ok: false, html: '', status: 0 }
  }
}

export function extractOgData(html: string) {
  function meta(prop: string): string | null {
    const pats = [
      new RegExp(`<meta[^>]+property=["']${prop}["'][^>]+content=["']([^"']+)["']`, 'i'),
      new RegExp(`<meta[^>]+content=["']([^"']+)["'][^>]+property=["']${prop}["']`, 'i'),
      new RegExp(`<meta[^>]+name=["']${prop}["'][^>]+content=["']([^"']+)["']`, 'i'),
      new RegExp(`<meta[^>]+content=["']([^"']+)["'][^>]+name=["']${prop}["']`, 'i'),
    ]
    for (const p of pats) {
      const m = html.match(p)
      if (m?.[1]?.trim()) return m[1].trim()
    }
    return null
  }
  return {
    title: meta('og:title') || meta('twitter:title'),
    image: meta('og:image') || meta('twitter:image'),
    description: meta('og:description') || meta('description'),
    price: meta('product:price:amount'),
  }
}
