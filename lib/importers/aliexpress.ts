import type { ImportResult } from './types'
import { cleanHtml, safeFetch, extractOgData } from './utils'

export async function importFromAliExpress(url: string): Promise<ImportResult> {
  const idMatch = url.match(/\/item\/(\d+)/) ||
    url.match(/itemId=(\d+)/) || url.match(/(\d{12,})/)
  const pid = idMatch?.[1]

  const apiKey = process.env.RAPIDAPI_KEY
  if (apiKey && pid) {
    try {
      const ctrl = new AbortController()
      const t = setTimeout(() => ctrl.abort(), 8000)
      const r = await fetch(
        `https://aliexpress-datahub.p.rapidapi.com/item_detail_3?itemId=${pid}`,
        {
          headers: {
            'X-RapidAPI-Key': apiKey,
            'X-RapidAPI-Host': 'aliexpress-datahub.p.rapidapi.com',
          },
          signal: ctrl.signal,
        }
      )
      clearTimeout(t)
      if (r.ok) {
        const data = await r.json()
        const item = data?.result?.item
        if (item?.title) {
          const price = parseFloat(
            item?.sku?.def?.promotionPrice ||
            item?.sku?.def?.price || '9.99'
          ) || 9.99
          const imgs: string[] = (item.imagePathList || item.images || [])
            .map((i: string) => i.startsWith('http') ? i : 'https:' + i)
            .slice(0, 8)
          return {
            success: true, url,
            product: {
              title: item.title,
              description: cleanHtml(item.title),
              price,
              compareAtPrice: Math.round(price * 1.5 * 100) / 100,
              images: imgs,
              variants: [{ title: 'Default', price }],
              tags: ['aliexpress', 'dropshipping'],
              vendor: item.storeInfo?.storeName || 'AliExpress',
              platform: 'aliexpress', sourceUrl: url,
            }
          }
        }
      }
    } catch { /* fall through */ }
  }

  const tries: string[] = []
  if (pid) tries.push(`https://www.aliexpress.com/item/${pid}.html`)
  if (pid) tries.push(`https://m.aliexpress.com/item/${pid}.html`)
  if (!tries.includes(url)) tries.push(url)

  for (const tryUrl of tries) {
    const { ok, html } = await safeFetch(tryUrl)
    if (!ok || html.length < 500) continue

    const og = extractOgData(html)

    const imgs: string[] = []
    if (og.image?.startsWith('http')) imgs.push(og.image)
    const re = /https?:\/\/ae\d*\.alicdn\.com\/[^"'\s>]{10,}/g
    let m: RegExpExecArray | null
    while ((m = re.exec(html)) !== null && imgs.length < 8) {
      const s = m[0].split('?')[0]
      if (/\.(jpg|jpeg|png|webp)/i.test(s) && !imgs.includes(s))
        imgs.push(s)
    }

    if (!og.title || og.title.length < 5) continue

    const title = og.title.replace(/\s*[-|]\s*(AliExpress|Alibaba)[^$]*/i, '').trim()
    let price = parseFloat(og.price || '0')
    if (!price) {
      const pm = html.match(/"promotionPrice"\s*:\s*"([\d.]+)"/)
        || html.match(/"salePrice"\s*:\s*\{[^}]*"value"\s*:\s*"([\d.]+)"/)
        || html.match(/\$\s*([\d]+\.[\d]{2})/)
      if (pm?.[1]) price = parseFloat(pm[1])
    }
    if (!price || price <= 0) price = 9.99

    return {
      success: true, url,
      product: {
        title, description: cleanHtml(og.description || title),
        price, compareAtPrice: Math.round(price * 1.5 * 100) / 100,
        images: imgs,
        variants: [{ title: 'Default', price }],
        tags: ['aliexpress', 'dropshipping'],
        vendor: 'AliExpress',
        platform: 'aliexpress', sourceUrl: url,
      }
    }
  }

  if (pid) {
    return {
      success: true, url,
      product: {
        title: `Produit AliExpress #${pid}`,
        description: 'Produit AliExpress',
        price: 9.99, images: [],
        variants: [{ title: 'Default', price: 9.99 }],
        tags: ['aliexpress'], vendor: 'AliExpress',
        platform: 'aliexpress', sourceUrl: url,
      }
    }
  }

  return { success: false, url, error: 'URL AliExpress invalide' }
}
