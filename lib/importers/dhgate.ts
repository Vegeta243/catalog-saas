import type { ImportResult } from './types'
import { safeFetch, cleanHtml, extractPrice, extractOgData } from './utils'

export async function importFromDHgate(url: string): Promise<ImportResult> {
  try {
    const { ok, html } = await safeFetch(url)
    if (!ok || html.length < 200) return { success: false, url, error: 'DHgate inaccessible' }

    const og = extractOgData(html)
    if (og.title && og.title.length > 4) {
      const price = parseFloat(og.price || '0') ||
        parseFloat(html.match(/"minPrice"\s*:\s*([\d.]+)/)?.[1] || '0') || 9.99
      const images: string[] = []
      if (og.image) images.push(og.image)
      const imgReg = /https?:\/\/[^"'\s]*dhresource[^"'\s]+/g
      let m: RegExpExecArray | null
      while ((m = imgReg.exec(html)) !== null && images.length < 8) {
        if (!images.includes(m[0])) images.push(m[0])
      }
      return {
        success: true, url,
        product: {
          title: og.title.replace(/\s*[-|]\s*DHgate.*$/i, '').trim(),
          description: cleanHtml(og.description || og.title),
          price,
          compareAtPrice: Math.round(price * 1.6 * 100) / 100,
          images,
          variants: [{ title: 'Default', price }],
          tags: ['dhgate', 'dropshipping'],
          vendor: 'DHgate',
          platform: 'dhgate',
          sourceUrl: url,
        },
      }
    }

    // JSON-LD fallback
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
              compareAtPrice: Math.round((price || 9.99) * 1.6 * 100) / 100,
              images: Array.isArray(jsonLd.image) ? jsonLd.image : [jsonLd.image].filter(Boolean),
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

    // HTML fallback
    const title =
      html.match(/<h1[^>]*class="[^"]*storeGoodsDetail[^"]*"[^>]*>([^<]+)<\/h1>/)?.[1]?.trim() ||
      html.match(/<title>([^|<]+)/)?.[1]?.trim() ||
      'Produit DHgate'
    const priceText =
      html.match(/class="[^"]*price[^"]*"[^>]*>\s*(?:US\s*)?\$?([\d.]+)/)?.[1] || '0'
    const images2: string[] = []
    const imgReg2 = /https?:\/\/[^"'\s]*dhresource[^"'\s]+\.jpg/g
    let m2: RegExpExecArray | null
    while ((m2 = imgReg2.exec(html)) !== null && images2.length < 8) {
      if (!images2.includes(m2[0])) images2.push(m2[0])
    }
    return {
      success: true, url,
      product: {
        title,
        description: cleanHtml(title),
        price: extractPrice(priceText) || 9.99,
        compareAtPrice: Math.round((extractPrice(priceText) || 9.99) * 1.6 * 100) / 100,
        images: images2,
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
