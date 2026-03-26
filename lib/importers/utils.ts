/**
 * lib/importers/utils.ts
 * Shared utilities for all importers
 */

export function detectPlatform(url: string): string {
  const u = url.toLowerCase()
  if (u.includes('aliexpress.com') || u.includes('aliexpress.ru')) return 'aliexpress'
  if (u.includes('alibaba.com')) return 'alibaba'
  if (u.includes('cjdropshipping.com') || u.includes('cjdropshippingapp.com')) return 'cjdropshipping'
  if (u.includes('dhgate.com')) return 'dhgate'
  if (u.includes('banggood.com')) return 'banggood'
  if (u.includes('temu.com')) return 'temu'
  return 'unknown'
}

export function cleanHtml(html: string): string {
  if (!html) return ''
  return html
    .replace(/<[^>]*>/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&nbsp;/g, ' ')
    .replace(/&#x27;/g, "'")
    .replace(/&#[0-9]+;/g, '')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, 5000)
}

export function extractPrice(text: string): number {
  if (!text) return 0
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
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8',
        'Accept-Language': 'en-US,en;q=0.9',
        'Cache-Control': 'no-cache',
        'Upgrade-Insecure-Requests': '1',
        ...extraHeaders,
      },
    })
    clearTimeout(t)
    const html = await res.text()
    return { ok: res.ok, html, status: res.status }
  } catch (error) {
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

/**
 * Extract JSON from JavaScript variable assignments in HTML
 */
export function extractJsonFromScript(html: string, varName: string): Record<string, unknown> | null {
  const patterns = [
    new RegExp(`${varName}\\s*=\\s*(\\{[\\s\\S]{50,500000}?\\})\\s*;`, 'i'),
    new RegExp(`${varName}\\s*=\\s*(\\{[\\s\\S]{50,500000}?\\})\\s*\\n`, 'i'),
  ]
  
  for (const pattern of patterns) {
    const match = html.match(pattern)
    if (match?.[1]) {
      try {
        return JSON.parse(match[1])
      } catch {
        continue
      }
    }
  }
  
  return null
}

/**
 * Extract balanced JSON object from HTML starting from a search string
 */
export function extractBalancedJson(html: string, searchStr: string): Record<string, unknown> | null {
  const si = html.indexOf(searchStr)
  if (si === -1) return null
  
  const braceStart = html.indexOf('{', si + searchStr.length)
  if (braceStart === -1) return null
  
  let depth = 0
  let inStr = false
  let esc = false
  const limit = Math.min(html.length, braceStart + 3_000_000) // Limit to 3MB
  
  for (let i = braceStart; i < limit; i++) {
    const c = html[i]
    if (esc) { esc = false; continue }
    if (c === '\\' && inStr) { esc = true; continue }
    if (c === '"') { inStr = !inStr; continue }
    if (inStr) continue
    if (c === '{') depth++
    else if (c === '}') {
      depth--
      if (depth === 0) {
        try {
          return JSON.parse(html.slice(braceStart, i + 1))
        } catch {
          return null
        }
      }
    }
  }
  
  return null
}

/**
 * Convert relative URL to absolute
 */
export function toAbsoluteUrl(src: string, baseUrl?: string): string {
  if (!src) return ''
  if (src.startsWith('http://') || src.startsWith('https://')) return src
  if (src.startsWith('//')) return 'https:' + src
  if (src.startsWith('/')) {
    if (baseUrl) {
      try {
        const base = new URL(baseUrl)
        return `${base.protocol}//${base.host}${src}`
      } catch {
        return 'https://' + src
      }
    }
    return 'https://' + src
  }
  return 'https://' + src
}

/**
 * Deduplicate array of strings
 */
export function deduplicate<T extends string>(arr: T[]): T[] {
  return [...new Set(arr)] as T[]
}

/**
 * Sleep for specified milliseconds
 */
export function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms))
}
