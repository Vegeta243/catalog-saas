import type { ImportResult } from './types'
import { cleanHtml, safeFetch, extractOgData } from './utils'

export async function importFromCJDropshipping(url: string): Promise<ImportResult> {
  const { ok, html } = await safeFetch(url)
  if (!ok) return { success: false, url, error: 'CJDropshipping inaccessible' }
  const og = extractOgData(html)
  const price = parseFloat(og.price || '0') ||
    parseFloat(html.match(/\$\s*([\d.]+)/)?.[1] || '9.99') || 9.99
  const imgs: string[] = []
  if (og.image) imgs.push(og.image)
  return {
    success: true, url,
    product: {
      title: og.title?.replace(/\s*[-|]\s*CJ.*/i, '').trim() || 'Produit CJDropshipping',
      description: cleanHtml(og.description || og.title || ''),
      price, compareAtPrice: Math.round(price * 1.5 * 100) / 100,
      images: imgs,
      variants: [{ title: 'Default', price }],
      tags: ['cjdropshipping', 'dropshipping'],
      vendor: 'CJDropshipping',
      platform: 'cjdropshipping', sourceUrl: url,
    }
  }
}
