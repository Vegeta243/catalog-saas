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
