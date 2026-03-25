import type { ImportResult } from './types'
import { fetchWithRetry, cleanHtml, extractPrice } from './utils'

export async function importFromAliExpress(url: string): Promise<ImportResult> {
  try {
    const productIdMatch = url.match(/\/item\/(\d+)|item_id=(\d+)|[?&]id=(\d+)/)
    const productId = productIdMatch?.[1] || productIdMatch?.[2] || productIdMatch?.[3]
      || url.match(/(\d{10,})/)?.[1]

    if (!productId) {
      return {
        success: false, url,
        error: "Impossible d'extraire l'ID produit AliExpress",
      }
    }

    // Method 1: RapidAPI if key configured
    const apiKey = process.env.RAPIDAPI_KEY
    if (apiKey) {
      try {
        const apiRes = await fetch(
          'https://aliexpress-datahub.p.rapidapi.com/item_detail_3?' +
          new URLSearchParams({ itemId: productId }),
          {
            headers: {
              'X-RapidAPI-Key': apiKey,
              'X-RapidAPI-Host': 'aliexpress-datahub.p.rapidapi.com',
            },
          }
        )
        if (apiRes.ok) {
          const data = await apiRes.json()
          const item = data?.result?.item
          if (item) {
            return {
              success: true, url,
              product: {
                title: item.title || 'Produit AliExpress',
                description: cleanHtml(item.description || item.title || ''),
                price: parseFloat(item.sku?.def?.promotionPrice || item.sku?.def?.price || '0'),
                compareAtPrice: parseFloat(item.sku?.def?.price || '0'),
                images: (item.imagePathList || item.images || [])
                  .map((img: string) => img.startsWith('http') ? img : 'https:' + img)
                  .slice(0, 10),
                variants: [{ title: 'Default', price: parseFloat(item.sku?.def?.promotionPrice || '0') }],
                tags: (item.categories || []).map((c: { name?: string }) => c.name).filter(Boolean),
                vendor: item.storeInfo?.storeName || 'AliExpress',
                platform: 'aliexpress',
                sourceUrl: url,
                weight: item.packageInfo?.grossWeight,
              },
            }
          }
        }
      } catch {
        // fall through to scraping
      }
    }

    // Method 2: Scrape HTML page
    const cleanUrl = url.replace('fr.aliexpress.com', 'www.aliexpress.com')
    const pageRes = await fetchWithRetry(cleanUrl)
    const html = await pageRes.text()

    // Helper: extract meta content regardless of attribute order
    function getMeta(h: string, prop: string): string | undefined {
      return h.match(new RegExp(`<meta[^>]+property=["']${prop}["'][^>]+content=["']([^"']+)["']`))?.[1] ||
        h.match(new RegExp(`<meta[^>]+content=["']([^"']+)["'][^>]+property=["']${prop}["']`))?.[1]
    }

    // Try OG tags from main page (often blocked by AliExpress, but worth trying)
    const ogTitle = getMeta(html, 'og:title')
    const ogImage = getMeta(html, 'og:image')
    const ogPrice = getMeta(html, 'product:price:amount')

    if (ogTitle && ogImage) {
      const price = parseFloat(ogPrice || '0') || 9.99
      return {
        success: true, url,
        product: {
          title: ogTitle,
          description: ogTitle,
          price,
          images: [ogImage],
          variants: [{ title: 'Default', price }],
          tags: ['aliexpress', 'dropshipping'],
          vendor: 'AliExpress',
          platform: 'aliexpress',
          sourceUrl: url,
        },
      }
    }

    // Try window.runParams JSON
    const dataMatch = html.match(/window\.runParams\s*=\s*([\s\S]{1,200000}?);\s*(?:window|var|let|const)/)
    if (dataMatch) {
      try {
        const data = JSON.parse(dataMatch[1])
        const item =
          data?.data?.productInfoComponent ||
          data?.productModule ||
          data

        const title =
          item?.subject ||
          html.match(/<h1[^>]*class="[^"]*product-title[^"]*"[^>]*>([^<]+)/)?.[1] ||
          html.match(/<title>([^|<]+)/)?.[1]?.trim() ||
          'Produit AliExpress'

        const priceText =
          html.match(/class="[^"]*product-price[^"]*"[^>]*>\s*.*?([\d]+[\.,][\d]+)/)?.[1] || '0'

        const images: string[] = []
        const imgMatches = html.matchAll(
          /(?:https:)?\/\/ae\d*\.alicdn\.com\/kf\/[^"'\s]+\.jpg[^"'\s]*/g
        )
        for (const m of imgMatches) {
          const img = m[0].startsWith('http') ? m[0] : 'https:' + m[0]
          if (!images.includes(img)) images.push(img)
          if (images.length >= 8) break
        }

        return {
          success: true, url,
          product: {
            title,
            description: cleanHtml(
              html.match(/class="[^"]*product-description[^"]*"[^>]*>([\s\S]*?)<\/div>/)?.[1] || title
            ),
            price: extractPrice(priceText) || 9.99,
            images,
            variants: [{ title: 'Default', price: extractPrice(priceText) || 9.99 }],
            tags: ['aliexpress'],
            vendor: 'AliExpress',
            platform: 'aliexpress',
            sourceUrl: url,
          },
        }
      } catch {
        // fall through to minimal extraction
      }
    }

    // Method 3.5: Try mobile URL for OG tags (simpler HTML, often accessible)
    try {
      const mobileUrl = cleanUrl.replace('www.aliexpress.com', 'm.aliexpress.com')
      if (mobileUrl !== cleanUrl) {
        const mRes = await fetchWithRetry(mobileUrl)
        const mHtml = await mRes.text()
        const mTitle = getMeta(mHtml, 'og:title')
        const mImage = getMeta(mHtml, 'og:image')
        const mPrice = getMeta(mHtml, 'product:price:amount')
        if (mTitle && mTitle !== 'AliExpress' && mImage) {
          const price = parseFloat(mPrice || '0') || 9.99
          return {
            success: true, url,
            product: {
              title: mTitle,
              description: mTitle,
              price,
              images: [mImage],
              variants: [{ title: 'Default', price }],
              tags: ['aliexpress', 'dropshipping'],
              vendor: 'AliExpress',
              platform: 'aliexpress',
              sourceUrl: url,
            },
          }
        }
      }
    } catch {
      // ignore mobile fallback error
    }

    // Method 4: Minimal extraction
    const title =
      html.match(/<h1[^>]*>([^<]{5,200})<\/h1>/)?.[1]?.trim() ||
      html.match(/<title>([^|<]+)/)?.[1]?.trim() ||
      'Produit AliExpress'

    const images: string[] = []
    const imgReg = /https?:\/\/ae\d*\.alicdn\.com\/kf\/[^"'\s]+/g
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
        tags: ['aliexpress', 'dropshipping'],
        vendor: 'AliExpress',
        platform: 'aliexpress',
        sourceUrl: url,
      },
    }
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : 'Erreur AliExpress'
    return { success: false, url, error: msg }
  }
}
