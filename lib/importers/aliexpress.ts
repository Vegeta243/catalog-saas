import type { ImportResult } from './types'
import { cleanHtml, safeFetch, extractOgData } from './utils'

// Regex that covers both old alicdn.com and new aliexpress-media.com CDN domains
const AE_IMG_RE =
  /https?:\/\/(?:(?:ae\d*|img|s)\.alicdn\.com|ae-pic-a\d+\.aliexpress-media\.com)\/[^"'\s>]{10,}/g

function extractAeImages(html: string, og: { image?: string | null }): string[] {
  const imgs: string[] = []
  if (og.image?.startsWith('http') && !/favicon|logo/.test(og.image)) imgs.push(og.image)
  let m: RegExpExecArray | null
  AE_IMG_RE.lastIndex = 0
  while ((m = AE_IMG_RE.exec(html)) !== null && imgs.length < 8) {
    const s = m[0].split('?')[0]
    if (/\.(jpg|jpeg|png|webp)/i.test(s) && !imgs.includes(s)) imgs.push(s)
  }
  return imgs
}

function buildProduct(
  title: string,
  html: string,
  og: { image?: string | null; description?: string | null; price?: string | null },
  url: string
) {
  const imgs = extractAeImages(html, og)
  let price = parseFloat(og.price || '0')
  if (!price) {
    const pm =
      html.match(/"promotionPrice"\s*:\s*"([\d.]+)"/) ||
      html.match(/"salePrice"\s*:\s*\{[^}]*"value"\s*:\s*"([\d.]+)"/) ||
      html.match(/\$\s*([\d]+\.[\d]{2})/)
    if (pm?.[1]) price = parseFloat(pm[1])
  }
  if (!price || price <= 0) price = 9.99
  return {
    success: true as const, url,
    product: {
      title,
      description: cleanHtml(og.description || title),
      price,
      compareAtPrice: Math.round(price * 1.5 * 100) / 100,
      images: imgs,
      variants: [{ title: 'Default', price }],
      tags: ['aliexpress', 'dropshipping'],
      vendor: 'AliExpress',
      platform: 'aliexpress', sourceUrl: url,
    },
  }
}

export async function importFromAliExpress(url: string): Promise<ImportResult> {
  const idMatch =
    url.match(/\/item\/(\d+)/) ||
    url.match(/itemId=(\d+)/) ||
    url.match(/(\d{12,})/)
  const pid = idMatch?.[1]

  // ── Strategy 1: RapidAPI (free 100 req/month, requires RAPIDAPI_KEY) ──────
  const apiKey = process.env.RAPIDAPI_KEY
  if (apiKey && pid) {
    try {
      const ctrl = new AbortController()
      const t = setTimeout(() => ctrl.abort(), 8000)
      const r = await fetch(
        `https://aliexpress-datahub.p.rapidapi.com/item_detail_3?itemId=${pid}`,
        {
          headers: {
            'X-RapidAPI-Key': apiKey,
            'X-RapidAPI-Host': 'aliexpress-datahub.p.rapidapi.com',
          },
          signal: ctrl.signal,
        }
      )
      clearTimeout(t)
      if (r.ok) {
        const data = await r.json()
        const item = data?.result?.item
        if (item?.title) {
          const price =
            parseFloat(item?.sku?.def?.promotionPrice || item?.sku?.def?.price || '9.99') || 9.99
          const imgs: string[] = (item.imagePathList || item.images || [])
            .map((i: string) => (i.startsWith('http') ? i : 'https:' + i))
            .slice(0, 8)
          return {
            success: true, url,
            product: {
              title: item.title,
              description: cleanHtml(item.title),
              price,
              compareAtPrice: Math.round(price * 1.5 * 100) / 100,
              images: imgs,
              variants: [{ title: 'Default', price }],
              tags: ['aliexpress', 'dropshipping'],
              vendor: item.storeInfo?.storeName || 'AliExpress',
              platform: 'aliexpress', sourceUrl: url,
            },
          }
        }
      }
    } catch { /* fall through */ }
  }

  // ── Strategy 2: ScrapingBee (1000 req/month free, requires SCRAPINGBEE_API_KEY) ──
  // ScrapingBee uses headless Chrome which executes JavaScript, so AliExpress
  // will fully populate window.runParams and og: meta tags.
  const sbKey = process.env.SCRAPINGBEE_API_KEY
  if (sbKey && pid) {
    try {
      const sbParams = new URLSearchParams({
        api_key: sbKey,
        url: `https://www.aliexpress.com/item/${pid}.html`,
        render_js: 'true',
        premium_proxy: 'false',
        country_code: 'us',
        wait: '3000',
      })
      const ctrl = new AbortController()
      const t = setTimeout(() => ctrl.abort(), 35000)
      const sbRes = await fetch(`https://app.scrapingbee.com/api/v1/?${sbParams}`, {
        signal: ctrl.signal,
      })
      clearTimeout(t)
      if (sbRes.ok) {
        const html = await sbRes.text()
        const og = extractOgData(html)

        // After JS execution, window.runParams is populated — parse it for extra data
        if (!og.title || og.title.length < 5) {
          const rpM = html.match(/window\.runParams\s*=\s*(\{[\s\S]{50,20000}?\}\s*;)/)
          if (rpM) {
            try {
              const rp = JSON.parse(rpM[1].replace(/;\s*$/, ''))
              const item =
                rp?.data?.item ||
                rp?.data?.productNode ||
                rp?.data?.itemInfo?.item ||
                {}
              ;(og as Record<string, string | null>).title =
                item.title || item.subject || og.title
            } catch { /* ignore parse errors */ }
          }
        }

        if (og.title && og.title.length > 5) {
          const title = og.title.replace(/\s*[-|]\s*(AliExpress|Alibaba)[^\n]*/i, '').trim()
          return buildProduct(title, html, og, url)
        }
      }
    } catch { /* fall through */ }
  }

  // ── Strategy 3: Direct HTML fetch ─────────────────────────────────────────
  // AliExpress currently serves a JS shell to all scrapers (og:title = "").
  // This may work if Vercel IPs happen to receive real content,
  // or if AliExpress changes their CDN behavior.
  // We try with Facebook bot UA (returns 200 without redirect) first.
  const FB_UA = 'facebookexternalhit/1.1 (+http://www.facebook.com/externalhit_uatext.php)'
  const tries: Array<{ tryUrl: string; ua?: Record<string, string> }> = []
  if (pid) {
    tries.push({ tryUrl: `https://www.aliexpress.com/item/${pid}.html`, ua: { 'User-Agent': FB_UA } })
    tries.push({ tryUrl: `https://fr.aliexpress.com/item/${pid}.html`, ua: { 'User-Agent': FB_UA } })
    tries.push({ tryUrl: `https://www.aliexpress.com/item/${pid}.html` })
  }
  if (!tries.some(t => t.tryUrl === url)) tries.push({ tryUrl: url })

  for (const { tryUrl, ua } of tries) {
    const { ok, html } = await safeFetch(tryUrl, 15000, ua)
    if (!ok || html.length < 500) continue

    const og = extractOgData(html)
    if (!og.title || og.title.length < 5) continue

    const title = og.title.replace(/\s*[-|]\s*(AliExpress|Alibaba)[^\n]*/i, '').trim()
    return buildProduct(title, html, og, url)
  }

  // ── Strategy 4: Graceful fallback ─────────────────────────────────────────
  // AliExpress uses client-side rendering — product data requires a headless
  // browser or API key to retrieve. Return a stub so the user can edit manually.
  // To enable full scraping, add SCRAPINGBEE_API_KEY to your Vercel env vars.
  if (pid) {
    return {
      success: true, url,
      product: {
        title: `Produit AliExpress #${pid}`,
        description:
          'Import AliExpress — titre et images \u00e0 compl\u00e9ter manuellement. ' +
          'Ajoutez SCRAPINGBEE_API_KEY dans vos variables Vercel pour activer le scraping automatique.',
        price: 9.99,
        images: [],
        variants: [{ title: 'Default', price: 9.99 }],
        tags: ['aliexpress', 'dropshipping'],
        vendor: 'AliExpress',
        platform: 'aliexpress', sourceUrl: url,
      },
    }
  }

  return { success: false, url, error: 'URL AliExpress invalide' }
}
