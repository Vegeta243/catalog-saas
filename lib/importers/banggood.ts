import type { ImportResult } from './types'
import { fetchWithRetry, cleanHtml } from './utils'

export async function importFromBanggood(url: string): Promise<ImportResult> {
  try {
    const res = await fetchWithRetry(url)
    const html = await res.text()

    const jsonLdMatch = html.match(
      /<script[^>]*type="application\/ld\+json"[^>]*>([\s\S]*?)<\/script>/
    )

    if (jsonLdMatch) {
      try {
        const data = JSON.parse(jsonLdMatch[1])
        const offer = data.offers || {}
        const price = parseFloat(offer.price || '0')
        const images = Array.isArray(data.image) ? data.image : [data.image].filter(Boolean)

        return {
          success: true, url,
          product: {
            title: data.name || 'Produit Banggood',
            description: cleanHtml(data.description || data.name || ''),
            price: price || 9.99,
            compareAtPrice: (price || 9.99) * 1.5,
            images,
            variants: [{ title: 'Default', price: price || 9.99 }],
            tags: ['banggood'],
            vendor: 'Banggood',
            platform: 'banggood',
            sourceUrl: url,
          },
        }
      } catch {
        // fall through
      }
    }

    const title =
      html.match(/<h1[^>]*>([^<]{5,200})<\/h1>/)?.[1]?.trim() ||
      html.match(/<title>([^|<\-]+)/)?.[1]?.trim() ||
      'Produit Banggood'
    const priceMatch = html.match(/\$\s?([\d.]+)/)
    const price = parseFloat(priceMatch?.[1] || '9.99') || 9.99

    const images: string[] = []
    const imgReg = /https?:\/\/imgaz\.staticbg\.com\/[^"'\s]+\.jpg/g
    let m: RegExpExecArray | null
    while ((m = imgReg.exec(html)) !== null && images.length < 8) {
      if (!images.includes(m[0])) images.push(m[0])
    }

    return {
      success: true, url,
      product: {
        title,
        description: title,
        price,
        images,
        variants: [{ title: 'Default', price }],
        tags: ['banggood'],
        vendor: 'Banggood',
        platform: 'banggood',
        sourceUrl: url,
      },
    }
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : 'Erreur Banggood'
    return { success: false, url, error: msg }
  }
}
