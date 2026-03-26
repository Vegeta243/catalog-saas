import type { ImportResult } from './types'
import { cleanHtml, safeFetch, extractOgData } from './utils'

// Regex that covers both old alicdn.com and new aliexpress-media.com CDN domains
const AE_IMG_RE =
  /https?:\/\/(?:(?:ae\d*|img|s)\.alicdn\.com|ae-pic-a\d+\.aliexpress-media\.com)\/[^"'\s>]{10,}/g

/** Extract product title from AliExpress HTML using all known patterns */
function extractAeTitle(html: string, og: { title?: string | null }): string | null {
  // 1. OG tag (populated when JS fully hydrates the page)
  if (og.title && og.title.length > 5 && !/^AliExpress$/i.test(og.title)) return og.title

  // 2. window.runParams JSON (populated by React hydration)
  const rpM = html.match(/window\.runParams\s*=\s*(\{[\s\S]{50,100000}?\})\s*;/)
  if (rpM) {
    try {
      const rp = JSON.parse(rpM[1])
      const t =
        rp?.data?.productInfoComponent?.subject ||
        rp?.data?.productModule?.subject ||
        rp?.data?.item?.subject ||
        rp?.productModule?.subject ||
        rp?.subject
      if (t && t.length > 5) return t
    } catch { /* malformed JSON — fall through */ }
  }

  // 3. JSON strings embedded in script blocks
  const sub = html.match(/"subject"\s*:\s*"([^"]{10,300})"/)
  if (sub?.[1]) return sub[1]
  const ptitle = html.match(/"productTitle"\s*:\s*"([^"]{10,300})"/)
  if (ptitle?.[1]) return ptitle[1]

  // 4. H1 with a product-title CSS class (React-rendered)
  const ptxt = html.match(/class="[^"]*product-title[^"]*"[^>]*>([\s\S]{10,300}?)<\/(?:h1|h2|span|div)>/i)
  if (ptxt?.[1]) {
    const clean = ptxt[1].replace(/<[^>]*>/g, '').trim()
    if (clean.length > 5) return clean
  }

  return null
}

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

  // ── Strategy 1: RapidAPI (free plan, requires RAPIDAPI_KEY) ────────────────
  // Tries item_detail_2 first, then item_detail as fallback (both on free plan).
  const apiKey = process.env.RAPIDAPI_KEY
  if (apiKey && pid) {
    for (const endpoint of ['item_detail_2', 'item_detail', 'item_detail_3']) {
      try {
        const ctrl = new AbortController()
        const t = setTimeout(() => ctrl.abort(), 10000)
        const r = await fetch(
          `https://aliexpress-datahub.p.rapidapi.com/${endpoint}?itemId=${pid}`,
          {
            headers: {
              'X-RapidAPI-Key': apiKey,
              'X-RapidAPI-Host': 'aliexpress-datahub.p.rapidapi.com',
            },
            signal: ctrl.signal,
          }
        )
        clearTimeout(t)
        // 403 = not subscribed to this endpoint, try next
        if (r.status === 403) continue
        if (!r.ok) continue
        const data = await r.json()
        // item_detail_2 / item_detail_3: data.result.item
        // item_detail: data.result (flat)
        const item = data?.result?.item ?? data?.result
        const title: string | undefined = item?.title || item?.subject || item?.productTitle
        if (!title) continue
        const price =
          parseFloat(
            item?.sku?.def?.promotionPrice ||
            item?.sku?.def?.price ||
            item?.salePrice ||
            item?.originalPrice ||
            '9.99'
          ) || 9.99
        const rawImgs: string[] =
          item?.imagePathList || item?.productImageList || item?.images || []
        const imgs = rawImgs
          .map((i: string) => (i.startsWith('http') ? i : 'https:' + i))
          .slice(0, 8)
        return {
          success: true as const, url,
          product: {
            title,
            description: cleanHtml(item?.description || title),
            price,
            compareAtPrice: Math.round(price * 1.5 * 100) / 100,
            images: imgs,
            variants: [{ title: 'Default', price }],
            tags: ['aliexpress', 'dropshipping'],
            vendor: item?.storeInfo?.storeName || item?.seller?.storeName || 'AliExpress',
            platform: 'aliexpress', sourceUrl: url,
          },
        }
      } catch { /* fall through to next endpoint */ }
    }
  }

  // ── Strategy 2: ScrapingBee (1000 req/month free, requires SCRAPINGBEE_API_KEY) ──
  // Uses headless Chromium that executes JavaScript. We use wait_browser=networkidle0
  // so the scraper waits until ALL XHR/fetch calls finish — including the product
  // data API calls that AliExpress loads after page boot.
  // Note: AliExpress has advanced anti-bot that returns empty window.runParams even
  // in headless Chrome without premium proxies. If title extraction fails, the
  // fallback (strategy 4) fires. Upgrade to premium_proxy:true (25 credits/req)
  // for higher success rates.
  const sbKey = process.env.SCRAPINGBEE_API_KEY
  if (sbKey && pid) {
    try {
      const sbParams = new URLSearchParams({
        api_key: sbKey,
        url: `https://www.aliexpress.com/item/${pid}.html`,
        render_js: 'true',
        premium_proxy: 'false',
        wait_browser: 'networkidle0',
        country_code: 'us',
      })
      const ctrl = new AbortController()
      const t = setTimeout(() => ctrl.abort(), 60000)
      const sbRes = await fetch(`https://app.scrapingbee.com/api/v1/?${sbParams}`, {
        signal: ctrl.signal,
      })
      clearTimeout(t)
      if (sbRes.ok) {
        const html = await sbRes.text()
        const og = extractOgData(html)

        // After JS execution, extract from all known AliExpress data patterns
        const title = extractAeTitle(html, og)
        if (title && title.length > 5) {
          ;(og as Record<string, string | null>).title = title
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
