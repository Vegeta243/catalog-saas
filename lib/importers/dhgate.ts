import type { ImportResult } from './types'
import { fetchWithRetry, cleanHtml, extractPrice } from './utils'

export async function importFromDHgate(url: string): Promise<ImportResult> {
  try {
    const res = await fetchWithRetry(url)
    const html = await res.text()

    // Extract JSON-LD structured data
    const jsonLdMatch = html.match(
      /<script[^>]*type="application\/ld\+json"[^>]*>([\s\S]*?)<\/script>/
    )

    if (jsonLdMatch) {
      try {
        const jsonLd = JSON.parse(jsonLdMatch[1])
        if (jsonLd['@type'] === 'Product') {
          const offer = Array.isArray(jsonLd.offers) ? jsonLd.offers[0] : jsonLd.offers
          const price = parseFloat(offer?.price || '0')
          return {
            success: true, url,
            product: {
              title: jsonLd.name,
              description: cleanHtml(jsonLd.description || jsonLd.name),
              price: price || 9.99,
              compareAtPrice: (price || 9.99) * 1.6,
              images: Array.isArray(jsonLd.image)
                ? jsonLd.image
                : [jsonLd.image].filter(Boolean),
              variants: [{ title: 'Default', price: price || 9.99 }],
              tags: ['dhgate', 'dropshipping'],
              vendor: jsonLd.brand?.name || 'DHgate',
              platform: 'dhgate',
              sourceUrl: url,
            },
          }
        }
      } catch {
        // fall through
      }
    }

    // Fallback: extract from HTML
    const title =
      html.match(/<h1[^>]*class="[^"]*storeGoodsDetail[^"]*"[^>]*>([^<]+)<\/h1>/)?.[1]?.trim() ||
      html.match(/<title>([^|<]+)/)?.[1]?.trim() ||
      'Produit DHgate'

    const priceText =
      html.match(/class="[^"]*price[^"]*"[^>]*>\s*(?:US\s*)?\$?([\d.]+)/)?.[1] || '0'

    const images: string[] = []
    const imgReg = /https?:\/\/[^"'\s]*dhresource[^"'\s]+\.jpg/g
    let m: RegExpExecArray | null
    while ((m = imgReg.exec(html)) !== null && images.length < 8) {
      if (!images.includes(m[0])) images.push(m[0])
    }

    return {
      success: true, url,
      product: {
        title,
        description: title,
        price: extractPrice(priceText) || 9.99,
        images,
        variants: [{ title: 'Default', price: extractPrice(priceText) || 9.99 }],
        tags: ['dhgate', 'dropshipping'],
        vendor: 'DHgate',
        platform: 'dhgate',
        sourceUrl: url,
      },
    }
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : 'Erreur DHgate'
    return { success: false, url, error: msg }
  }
}
