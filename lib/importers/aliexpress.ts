import type { ImportResult } from './types'
import { cleanHtml, safeFetch, extractOgData, extractPrice } from './utils'

export async function importFromAliExpress(url: string): Promise<ImportResult> {
  // Extract product ID
  const idMatch =
    url.match(/\/item\/(\d+)/) ||
    url.match(/itemId=(\d+)/) ||
    url.match(/(\d{12,})/)
  const productId = idMatch?.[1]

  // Method 1: RapidAPI (most reliable when configured)
  const apiKey = process.env.RAPIDAPI_KEY
  if (apiKey && productId) {
    try {
      const apiRes = await fetch(
        'https://aliexpress-datahub.p.rapidapi.com/item_detail_3?itemId=' + productId,
        {
          headers: {
            'X-RapidAPI-Key': apiKey,
            'X-RapidAPI-Host': 'aliexpress-datahub.p.rapidapi.com',
          },
          signal: AbortSignal.timeout(8000),
        }
      )
      if (apiRes.ok) {
        const data = await apiRes.json()
        const item = data?.result?.item
        if (item?.title) {
          const price =
            parseFloat(item?.sku?.def?.promotionPrice || item?.sku?.def?.price || '0') || 9.99
          const rawImages: string[] = item.imagePathList || item.images || []
          const images = rawImages
            .map((img: string) => (img.startsWith('http') ? img : 'https:' + img))
            .filter(Boolean)
            .slice(0, 8)
          return {
            success: true,
            url,
            product: {
              title: item.title,
              description: cleanHtml(item.title),
              price,
              compareAtPrice: Math.round(price * 1.5 * 100) / 100,
              images,
              variants: [{ title: 'Default', price }],
              tags: ['aliexpress', 'dropshipping'],
              vendor: item.storeInfo?.storeName || 'AliExpress',
              platform: 'aliexpress',
              sourceUrl: url,
            },
          }
        }
      }
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : 'RapidAPI error'
      console.log('[AliExpress] RapidAPI failed:', msg)
    }
  }

  // Method 2: Try www + mobile URLs for OG tags
  const baseUrl = productId
    ? 'https://www.aliexpress.com/item/' + productId + '.html'
    : url.replace('fr.aliexpress.com', 'www.aliexpress.com')
  const mobileUrl = productId
    ? 'https://m.aliexpress.com/item/' + productId + '.html'
    : null

  const seen = new Set<string>([baseUrl])
  const urlsToTry: string[] = [baseUrl]
  if (mobileUrl && !seen.has(mobileUrl)) { seen.add(mobileUrl); urlsToTry.push(mobileUrl) }
  if (!seen.has(url)) { seen.add(url); urlsToTry.push(url) }

  for (const tryUrl of urlsToTry) {
    const { ok, html } = await safeFetch(tryUrl)
    if (!ok || html.length < 500) continue

    const og = extractOgData(html)

    // Collect alicdn images from page source
    const images: string[] = []
    if (og.image) images.push(og.image)
    const imgReg = /https?:\/\/ae\d*\.alicdn\.com\/[^"'\s>]{10,}/g
    let m: RegExpExecArray | null
    while ((m = imgReg.exec(html)) !== null && images.length < 8) {
      const img = m[0].split('?')[0]
      if (/\.(jpg|jpeg|png|webp)/i.test(img) && !images.includes(img)) {
        images.push(img)
      }
    }

    if (!og.title || og.title.length < 5) {
      // Try window.runParams JSON fallback
      const dataMatch = html.match(/window\.runParams\s*=\s*([\s\S]{1,200000}?);\s*(?:window|var|let|const)/)
      if (dataMatch) {
        try {
          const data = JSON.parse(dataMatch[1])
          const item = data?.data?.productInfoComponent || data?.productModule || data
          const title = item?.subject ||
            html.match(/<h1[^>]*>([^<]{5,200})<\/h1>/)?.[1]?.trim() ||
            'Produit AliExpress'
          const priceText = html.match(/class="[^"]*product-price[^"]*"[^>]*>[\s\S]*?([\d]+[.,][\d]+)/)?.[1] || '9.99'
          const price = extractPrice(priceText) || 9.99
          if (title !== 'Produit AliExpress') {
            return {
              success: true, url,
              product: {
                title, description: cleanHtml(title), price,
                compareAtPrice: Math.round(price * 1.5 * 100) / 100,
                images, variants: [{ title: 'Default', price }],
                tags: ['aliexpress', 'dropshipping'],
                vendor: 'AliExpress', platform: 'aliexpress', sourceUrl: url,
              },
            }
          }
        } catch { /* ignore */ }
      }
      continue
    }

    const cleanTitle = og.title.replace(/\s*[-|]\s*(AliExpress|Alibaba)\s*$/i, '').trim()
    let price = parseFloat(og.price || '0') || 0
    if (!price) {
      const pm =
        html.match(/"salePrice"\s*:\s*\{"value"\s*:\s*"([\d.]+)"/) ||
        html.match(/"promotionPrice"\s*:\s*"([\d.]+)"/) ||
        html.match(/\$\s*(\d+\.\d{2})/)
      if (pm?.[1]) price = parseFloat(pm[1])
    }
    if (!price) price = 9.99

    return {
      success: true, url,
      product: {
        title: cleanTitle,
        description: cleanHtml(og.description || cleanTitle),
        price,
        compareAtPrice: Math.round(price * 1.5 * 100) / 100,
        images,
        variants: [{ title: 'Default', price }],
        tags: ['aliexpress', 'dropshipping'],
        vendor: 'AliExpress',
        platform: 'aliexpress',
        sourceUrl: url,
      },
    }
  }

  // Last resort: return minimal result with product ID
  if (productId) {
    return {
      success: true,
      url,
      product: {
        title: 'Produit AliExpress #' + productId,
        description: 'Produit importé depuis AliExpress',
        price: 9.99,
        images: [],
        variants: [{ title: 'Default', price: 9.99 }],
        tags: ['aliexpress', 'dropshipping'],
        vendor: 'AliExpress',
        platform: 'aliexpress',
        sourceUrl: url,
      },
    }
  }

  return {
    success: false,
    url,
    error: "URL AliExpress invalide — ID produit introuvable",
  }
}
