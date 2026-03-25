import type { ImportResult } from './types'
import { cleanHtml, safeFetch, extractOgData, extractPrice } from './utils'

export async function importUniversal(url: string): Promise<ImportResult> {
  let platform = 'unknown'
  try { platform = new URL(url).hostname.replace('www.', '').split('.')[0] } catch { /* ignore */ }

  const { ok, html } = await safeFetch(url)
  if (!ok || html.length < 200) {
    return { success: false, url, error: 'Impossible de charger la page produit' }
  }

  // Strategy 1: OpenGraph / Twitter meta (most reliable on e-commerce sites)
  const og = extractOgData(html)
  if (og.title && og.title.length > 4) {
    const price = parseFloat(og.price || '0') || extractPrice(
      html.match(/(?:price|prix)[^>]{0,30}>([\s\S]{0,30}?\d+[.,]\d+)/i)?.[1] || ''
    ) || 9.99
    return {
      success: true, url,
      product: {
        title: og.title.trim(),
        description: cleanHtml(og.description || og.title),
        price,
        compareAtPrice: Math.round(price * 1.4 * 100) / 100,
        images: og.image ? [og.image] : [],
        variants: [{ title: 'Default', price }],
        tags: [platform, 'dropshipping'],
        vendor: platform,
        platform,
        sourceUrl: url,
      },
    }
  }

  // Strategy 2: JSON-LD structured data
  const jsonLdMatches = [...html.matchAll(
    /<script[^>]+type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi
  )]
  for (const match of jsonLdMatches) {
    try {
      const raw = JSON.parse(match[1])
      const data = Array.isArray(raw)
        ? raw.find((d: { '@type'?: string }) => d['@type'] === 'Product')
        : raw['@type'] === 'Product' ? raw : null
      if (!data) continue
      const offer = Array.isArray(data.offers) ? data.offers[0] : data.offers || {}
      const price = parseFloat(offer.price || '0') || 9.99
      const images: string[] = Array.isArray(data.image)
        ? data.image
        : [data.image].filter(Boolean)
      return {
        success: true, url,
        product: {
          title: data.name || 'Produit importé',
          description: cleanHtml(data.description || data.name || ''),
          price,
          compareAtPrice: Math.round(price * 1.4 * 100) / 100,
          images,
          variants: [{ title: 'Default', price }],
          tags: [platform, 'dropshipping'],
          vendor: (data.brand as { name?: string })?.name || platform,
          platform,
          sourceUrl: url,
        },
      }
    } catch { /* continue */ }
  }

  // Strategy 3: H1 + price pattern fallback
  const title =
    html.match(/<h1[^>]*>([^<]{5,200})<\/h1>/)?.[1]?.trim() ||
    html.match(/<title>([^|<\-(]{5,200})/)?.[1]?.trim() ||
    'Produit importé'
  const price = extractPrice(
    html.match(/(?:\$|€|EUR)\s*([\d]+[.,][\d]{2})/)?.[1] || ''
  ) || 9.99

  return {
    success: true, url,
    product: {
      title,
      description: cleanHtml(title),
      price,
      images: [],
      variants: [{ title: 'Default', price }],
      tags: [platform, 'dropshipping'],
      vendor: platform,
      platform,
      sourceUrl: url,
    },
  }
}
