import type { ImportResult } from './types'
import { safeFetch, cleanHtml, extractOgData } from './utils'

export async function importFromAlibaba(url: string): Promise<ImportResult> {
  try {
    const { ok, html } = await safeFetch(url)
    if (!ok || html.length < 200) return { success: false, url, error: 'Alibaba inaccessible' }

    const og = extractOgData(html)
    if (og.title && og.title.length > 4) {
      const price = parseFloat(og.price || '0') || 9.99
      const images: string[] = []
      if (og.image) images.push(og.image)
      const imgReg = /https?:\/\/[^"'\s]*\.alicdn\.com\/[^"'\s]+\.jpe?g/g
      let m: RegExpExecArray | null
      while ((m = imgReg.exec(html)) !== null && images.length < 8) {
        if (!images.includes(m[0])) images.push(m[0])
      }
      return {
        success: true, url,
        product: {
          title: og.title.replace(/\s*[-|]\s*Alibaba.*$/i, '').trim(),
          description: cleanHtml(og.description || og.title),
          price,
          compareAtPrice: Math.round(price * 2 * 100) / 100,
          images,
          variants: [{ title: 'MOQ 1 unit', price }],
          tags: ['alibaba', 'wholesale'],
          vendor: 'Alibaba Supplier',
          platform: 'alibaba',
          sourceUrl: url,
        },
      }
    }

    // JSON-LD extraction
    const jsonLdMatch = html.match(
      /<script[^>]*type="application\/ld\+json"[^>]*>([\s\S]*?)<\/script>/
    )

    if (jsonLdMatch) {
      try {
        const data = JSON.parse(jsonLdMatch[1])
        if (data.name) {
          const offer = data.offers || {}
          const price = parseFloat(offer.price || offer.lowPrice || '0')
          const images = Array.isArray(data.image)
            ? data.image
            : [data.image].filter(Boolean)

          return {
            success: true, url,
            product: {
              title: data.name,
              description: cleanHtml(data.description || data.name),
              price: price || 9.99,
              compareAtPrice: (price || 9.99) * 2,
              images,
              variants: [{ title: 'MOQ 1 unit', price: price || 9.99 }],
              tags: ['alibaba', 'wholesale'],
              vendor: data.brand?.name || 'Alibaba Supplier',
              platform: 'alibaba',
              sourceUrl: url,
            },
          }
        }
      } catch {
        // fall through
      }
    }

    // Fallback
    const title =
      html.match(/<h1[^>]*class="[^"]*title[^"]*"[^>]*>([^<]{5,200})<\/h1>/)?.[1]?.trim() ||
      html.match(/<title>([^|<\-]+)/)?.[1]?.trim() ||
      'Produit Alibaba'

    const images: string[] = []
    const imgReg = /https?:\/\/[^"'\s]*\.alicdn\.com\/[^"'\s]+\.jpe?g/g
    let m: RegExpExecArray | null
    while ((m = imgReg.exec(html)) !== null && images.length < 8) {
      if (!images.includes(m[0])) images.push(m[0])
    }

    return {
      success: true, url,
      product: {
        title,
        description: title,
        price: 9.99,
        images,
        variants: [{ title: 'Default', price: 9.99 }],
        tags: ['alibaba', 'wholesale'],
        vendor: 'Alibaba',
        platform: 'alibaba',
        sourceUrl: url,
      },
    }
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : 'Erreur Alibaba'
    return { success: false, url, error: msg }
  }
}
