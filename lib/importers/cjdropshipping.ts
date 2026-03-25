import type { ImportResult } from './types'
import { safeFetch, cleanHtml, extractOgData } from './utils'

export async function importFromCJDropshipping(url: string): Promise<ImportResult> {
  try {
    const pid = url.match(
      /\/product\/([A-Za-z0-9-]+)\.html|[?&]pid=([A-Za-z0-9-]+)|\/([A-Z0-9]{6,})\./
    )?.[1]

    // Method 1: CJ API if credentials configured
    const cjApiKey = process.env.CJ_API_KEY
    const cjEmail = process.env.CJ_EMAIL
    const cjPassword = process.env.CJ_PASSWORD_HASH

    if (cjApiKey || (cjEmail && cjPassword)) {
      let token = cjApiKey

      if (!token && cjEmail && cjPassword) {
        try {
          const loginRes = await fetch(
            'https://developers.cjdropshipping.com/api2.0/v1/authentication/getAccessToken',
            {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ email: cjEmail, password: cjPassword }),
            }
          )
          const loginData = await loginRes.json()
          token = loginData?.data?.accessToken
        } catch {
          // fall through
        }
      }

      if (token && pid) {
        try {
          const productRes = await fetch(
            `https://developers.cjdropshipping.com/api2.0/v1/product/query?pid=${pid}`,
            {
              headers: {
                'CJ-Access-Token': token,
                'Content-Type': 'application/json',
              },
            }
          )
          if (productRes.ok) {
            const data = await productRes.json()
            const p = data?.data
            if (p) {
              return {
                success: true, url,
                product: {
                  title: p.productNameEn || p.productName,
                  description: cleanHtml(p.description || p.productNameEn),
                  price: parseFloat(p.sellPrice || p.productPrice || '0'),
                  compareAtPrice: parseFloat(p.productPrice || '0') * 1.5,
                  images: (p.productImageSet || '').split(',').filter(Boolean).slice(0, 10),
                  variants: (Array.isArray(p.variants) && p.variants.length > 0)
                    ? p.variants.map((v: { variantName?: string; variantSellPrice?: string; variantPrice?: string; vid?: string }) => ({
                        title: v.variantName || 'Default',
                        price: parseFloat(v.variantSellPrice || v.variantPrice || '0'),
                        sku: v.vid,
                      }))
                    : [{ title: 'Default', price: parseFloat(p.sellPrice || '0') }],
                  tags: [p.categoryName, 'cjdropshipping'].filter(Boolean),
                  vendor: 'CJDropshipping',
                  platform: 'cjdropshipping',
                  sourceUrl: url,
                  weight: parseFloat(p.productWeight || '0'),
                },
              }
            }
          }
        } catch {
          // fall through to scraping
        }
      }
    }

    // Method 2: Scrape page HTML
    const { ok, html } = await safeFetch(url)
    if (!ok) {
      return { success: true, url, product: {
        title: 'Produit CJDropshipping', description: 'Produit CJDropshipping',
        price: 9.99, images: [], variants: [{ title: 'Default', price: 9.99 }],
        tags: ['cjdropshipping', 'dropshipping'], vendor: 'CJDropshipping',
        platform: 'cjdropshipping', sourceUrl: url,
      }}
    }

    const og = extractOgData(html)
    const title = og.title?.replace(/\s*[-|]\s*(CJ.*)?$/i, '').trim() ||
      html.match(/<h1[^>]*class="[^"]*product[^"]*"[^>]*>([^<]+)<\/h1>/)?.[1]?.trim() ||
      html.match(/<title>([^|<\-]+)/)?.[1]?.trim() ||
      'Produit CJDropshipping'

    const priceMatch = html.match(/class="[^"]*price[^"]*"[^>]*>\s*\$?([\d.]+)/)
    const price = parseFloat(og.price || priceMatch?.[1] || '0') || 9.99

    const images: string[] = []
    if (og.image) images.push(og.image)
    const imgReg = /https?:\/\/cbu01\.alicdn\.com\/[^"'\s]+\.jpg/g
    let m: RegExpExecArray | null
    while ((m = imgReg.exec(html)) !== null && images.length < 8) {
      if (!images.includes(m[0])) images.push(m[0])
    }

    return {
      success: true, url,
      product: {
        title,
        description: cleanHtml(og.description || title),
        price,
        images,
        variants: [{ title: 'Default', price }],
        tags: ['cjdropshipping', 'dropshipping'],
        vendor: 'CJDropshipping',
        platform: 'cjdropshipping',
        sourceUrl: url,
      },
    }
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : 'Erreur CJDropshipping'
    return { success: false, url, error: msg }
  }
}
