import type { ImportResult } from './types'
import { fetchWithRetry, cleanHtml } from './utils'

export async function importUniversal(url: string): Promise<ImportResult> {
  try {
    const res = await fetchWithRetry(url)
    const html = await res.text()
    const platform = new URL(url).hostname.replace('www.', '').split('.')[0]

    // Try JSON-LD first (best structured data)
    const allJsonLd = [...html.matchAll(
      /<script[^>]*type="application\/ld\+json"[^>]*>([\s\S]*?)<\/script>/g
    )]

    for (const match of allJsonLd) {
      try {
        const data = JSON.parse(match[1])
        const product = Array.isArray(data)
          ? data.find((d: { '@type'?: string }) => d['@type'] === 'Product')
          : data['@type'] === 'Product' ? data : null

        if (product) {
          const offer = Array.isArray(product.offers)
            ? product.offers[0]
            : product.offers || {}
          const price = parseFloat(offer.price || '0') || 9.99
          const images = Array.isArray(product.image)
            ? product.image
            : [product.image].filter(Boolean)

          return {
            success: true, url,
            product: {
              title: product.name || 'Produit importe',
              description: cleanHtml(product.description || product.name || ''),
              price,
              compareAtPrice: price * 1.4,
              images,
              variants: [{ title: 'Default', price }],
              tags: [platform, 'dropshipping'],
              vendor: platform,
              platform,
              sourceUrl: url,
            },
          }
        }
      } catch {
        // continue
      }
    }

    // OpenGraph tags
    const ogTitle = html.match(/<meta[^>]*property="og:title"[^>]*content="([^"]+)"/)?.[1]
    const ogDesc = html.match(/<meta[^>]*property="og:description"[^>]*content="([^"]+)"/)?.[1]
    const ogImage = html.match(/<meta[^>]*property="og:image"[^>]*content="([^"]+)"/)?.[1]
    const ogPrice = html.match(/<meta[^>]*property="product:price:amount"[^>]*content="([^"]+)"/)?.[1]

    if (ogTitle) {
      const price = parseFloat(ogPrice || '0') || 9.99
      return {
        success: true, url,
        product: {
          title: ogTitle,
          description: cleanHtml(ogDesc || ogTitle),
          price,
          images: ogImage ? [ogImage] : [],
          variants: [{ title: 'Default', price }],
          tags: [platform, 'dropshipping'],
          vendor: platform,
          platform,
          sourceUrl: url,
        },
      }
    }

    // Last resort: H1 + price pattern
    const title =
      html.match(/<h1[^>]*>([^<]{5,200})<\/h1>/)?.[1]?.trim() ||
      html.match(/<title>([^|<\-]+)/)?.[1]?.trim() ||
      'Produit importe'
    const priceText =
      html.match(/(?:price|prix)[^>]*>[\s\S]{0,20}?([\d,]+\.?\d*)/i)?.[1] || '9.99'
    const price = parseFloat(priceText.replace(',', '.')) || 9.99

    return {
      success: true, url,
      product: {
        title,
        description: title,
        price,
        images: [],
        variants: [{ title: 'Default', price }],
        tags: [platform, 'dropshipping'],
        vendor: platform,
        platform,
        sourceUrl: url,
      },
    }
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : 'Erreur import'
    return { success: false, url, error: msg }
  }
}
