import type { ImportResult } from './types'
import { fetchWithRetry, cleanHtml } from './utils'

export async function importUniversal(url: string): Promise<ImportResult> {
  try {
    const res = await fetchWithRetry(url)
    const html = await res.text()
    const platform = new URL(url).hostname.replace('www.', '').split('.')[0]

    // Helper: extract meta content regardless of attribute order
    function getMeta(prop: string): string | undefined {
      return html.match(new RegExp(`<meta[^>]+property=["']${prop}["'][^>]+content=["']([^"']+)["']`))?.[1] ||
        html.match(new RegExp(`<meta[^>]+content=["']([^"']+)["'][^>]+property=["']${prop}["']`))?.[1]
    }

    // Strategy 1: OpenGraph tags (always present on e-commerce sites, most reliable)
    const ogTitle = getMeta('og:title')
    const ogDesc = getMeta('og:description')
    const ogImage = getMeta('og:image')
    const ogPrice = getMeta('product:price:amount')

    if (ogTitle && ogImage) {
      const price = parseFloat(ogPrice || '0') || 9.99
      return {
        success: true, url,
        product: {
          title: ogTitle,
          description: cleanHtml(ogDesc || ogTitle),
          price,
          compareAtPrice: price * 1.4,
          images: [ogImage],
          variants: [{ title: 'Default', price }],
          tags: [platform, 'dropshipping'],
          vendor: platform,
          platform,
          sourceUrl: url,
        },
      }
    }

    // Strategy 2: JSON-LD structured data
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

    // Strategy 3: OG title alone (no image)
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
