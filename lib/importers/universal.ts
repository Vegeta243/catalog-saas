import type { ImportResult } from './types'
import { cleanHtml, safeFetch, extractOgData, extractPrice } from './utils'

export async function importUniversal(url: string): Promise<ImportResult> {
  let platform = 'unknown'
  try { platform = new URL(url).hostname.replace('www.', '').split('.')[0] } catch { /* ignore */ }

  const { ok, html } = await safeFetch(url)
  if (!ok || html.length < 200) {
    return { success: false, url, error: 'Page inaccessible' }
  }

  const og = extractOgData(html)
  if (og.title && og.title.length > 5) {
    const price = parseFloat(og.price || '0') ||
      extractPrice(html.match(/(?:\$|EUR|€)\s*([\d]+[.,][\d]{2})/)?.[1] || '') ||
      9.99
    return {
      success: true, url,
      product: {
        title: og.title.trim(),
        description: cleanHtml(og.description || og.title),
        price, compareAtPrice: Math.round(price * 1.4 * 100) / 100,
        images: og.image ? [og.image] : [],
        variants: [{ title: 'Default', price }],
        tags: [platform, 'dropshipping'],
        vendor: platform, platform, sourceUrl: url,
      }
    }
  }

  const title = html.match(/<h1[^>]*>([^<]{5,200})<\/h1>/)?.[1]?.trim()
    || html.match(/<title>([^<]{5,200}?)<\/title>/)?.[1]?.trim()
    || 'Produit importe'
  const price = extractPrice(
    html.match(/(?:\$|EUR|€)\s*([\d]+[.,][\d]{2})/)?.[1] || ''
  ) || 9.99

  return {
    success: true, url,
    product: {
      title, description: cleanHtml(title),
      price, images: [],
      variants: [{ title: 'Default', price }],
      tags: [platform, 'dropshipping'],
      vendor: platform, platform, sourceUrl: url,
    }
  }
}
