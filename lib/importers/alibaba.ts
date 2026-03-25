import type { ImportResult } from './types'
import { cleanHtml, safeFetch, extractOgData } from './utils'

export async function importFromAlibaba(url: string): Promise<ImportResult> {
  const { ok, html } = await safeFetch(url)
  if (!ok) return { success: false, url, error: 'Alibaba inaccessible' }
  const og = extractOgData(html)
  const price = parseFloat(og.price || '0') || 9.99
  const imgs: string[] = []
  if (og.image) imgs.push(og.image)
  return {
    success: true, url,
    product: {
      title: og.title?.replace(/\s*[-|]\s*Alibaba.*/i, '').trim() || 'Produit Alibaba',
      description: cleanHtml(og.description || og.title || ''),
      price, compareAtPrice: Math.round(price * 2 * 100) / 100,
      images: imgs,
      variants: [{ title: 'Default', price }],
      tags: ['alibaba', 'wholesale'],
      vendor: 'Alibaba', platform: 'alibaba', sourceUrl: url,
    }
  }
}
