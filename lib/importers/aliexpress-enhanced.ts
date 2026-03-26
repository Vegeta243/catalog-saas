/**
 * lib/importers/aliexpress-enhanced.ts
 * AliExpress scraper with multiple fallback strategies, retry logic, and anti-bot bypass
 * Supports: RapidAPI, ScrapingBee, direct HTML with multiple domains, JSON endpoints
 */

import type { ImportResult, ProductData, ProductVariant } from './types'
import { extractOgData, safeFetch } from './utils'

interface ScrapingStrategy {
  name: string
  priority: number
  timeout: number
  execute: (productId: string, signal: AbortSignal) => Promise<ProductData | null>
}

const AE_IMG_RE = /https?:\/\/(?:(?:ae\d*|img|s)\.alicdn\.com|ae-pic-a\d+\.aliexpress-media\.com)\/[^"'\s>]{10,}/g

function toAbsoluteUrl(src: string): string {
  if (!src) return ''
  if (src.startsWith('http://') || src.startsWith('https://')) return src
  if (src.startsWith('//')) return 'https:' + src
  if (src.startsWith('/')) return 'https://www.aliexpress.com' + src
  return 'https://' + src
}

function extractImages(html: string, ogImage?: string | null): string[] {
  const images: string[] = []
  
  // Add OG image first if valid
  if (ogImage?.startsWith('http') && !/favicon|logo/.test(ogImage)) {
    images.push(ogImage)
  }

  // Extract from imagePathList JSON patterns
  const imagePathMatches = [
    ...html.matchAll(/"imagePathList"\s*:\s*\[([^\]]+)\]/g)
  ]
  for (const match of imagePathMatches) {
    const urls = match[1].replace(/["\s]/g, '').split(',')
      .filter((u: string) => u.length > 10)
      .map((u: string) => toAbsoluteUrl(u))
    images.push(...urls)
  }

  // Extract from CDN regex
  let m: RegExpExecArray | null
  AE_IMG_RE.lastIndex = 0
  while ((m = AE_IMG_RE.exec(html)) !== null && images.length < 12) {
    const s = m[0].split('?')[0]
    if (/\.(jpg|jpeg|png|webp)/i.test(s) && !images.includes(s)) {
      images.push(s)
    }
  }

  // Deduplicate and limit
  return [...new Set(images)].slice(0, 12)
}

function extractPrice(html: string): number {
  const patterns = [
    /"minAmount"\s*:\s*\{[^}]*?"value"\s*:\s*([\d.]+)/,
    /"minActivityAmount"\s*:\s*\{[^}]*?"value"\s*:\s*([\d.]+)/,
    /"currentPrice"\s*:\s*\{[^}]*?"value"\s*:\s*([\d.]+)/,
    /"salePrice"\s*:\s*"([\d.]+)"/,
    /"originalPrice"\s*:\s*"([\d.]+)"/,
    /"prices"\s*:\s*\{"min"\s*:\s*"([\d.]+)"/,
    /"discountPrice"\s*:\s*\{[^}]*?"value"\s*:\s*([\d.]+)/,
    /\$\s*([\d]+\.[\d]{2})/,
    /EUR\s*([\d]+\.[\d]{2})/i,
  ]

  for (const pattern of patterns) {
    const match = html.match(pattern)
    if (match) {
      const price = parseFloat(match[1])
      if (price > 0 && price < 100000) return price
    }
  }

  return 0
}

function extractTitle(html: string, ogTitle?: string | null): string {
  // OG title (if not generic)
  if (ogTitle && ogTitle.length > 5 && !/AliExpress/i.test(ogTitle)) {
    return ogTitle.trim().substring(0, 200)
  }

  // window.runParams JSON
  const runParamsMatch = html.match(/window\.runParams\s*=\s*(\{[\s\S]{50,200000}?\})\s*;/)
  if (runParamsMatch) {
    try {
      const rp = JSON.parse(runParamsMatch[1])
      const title = 
        rp?.data?.productInfoComponent?.subject ||
        rp?.data?.productModule?.subject ||
        rp?.data?.item?.subject ||
        rp?.productModule?.subject ||
        rp?.subject
      if (title && title.length > 5) {
        return title.trim().substring(0, 200)
      }
    } catch { /* ignore */ }
  }

  // Embedded JSON patterns
  const jsonPatterns = [
    /"subject"\s*:\s*"((?:[^"\\]|\\.){10,300})"/,
    /"productTitle"\s*:\s*"((?:[^"\\]|\\.){10,300})"/,
    /"title"\s*:\s*"((?:[^"\\]|\\.){10,300})"(?=\s*[,}])/,
  ]

  for (const pattern of jsonPatterns) {
    const match = html.match(pattern)
    if (match?.[1]) {
      const title = match[1]
        .replace(/\\u([0-9a-fA-F]{4})/g, (_, h) => String.fromCharCode(parseInt(h, 16)))
        .replace(/\\n/g, ' ').replace(/\\r/g, '').replace(/\\t/g, ' ')
        .trim()
      if (title.length > 5) return title.substring(0, 200)
    }
  }

  // HTML product-title class
  const titleMatch = html.match(/class="[^"]*product-title[^"]*"[^>]*>([\s\S]{10,300}?)<\/(?:h1|h2|span|div)>/i)
  if (titleMatch?.[1]) {
    const clean = titleMatch[1].replace(/<[^>]*>/g, '').trim()
    if (clean.length > 5) return clean.substring(0, 200)
  }

  return ''
}

function extractDescription(html: string, title: string): string {
  // Try OG description
  const og = extractOgData(html)
  if (og.description && og.description.length > 50) {
    return og.description.substring(0, 5000)
  }

  // Try JSON description
  const descMatch = html.match(/"description"\s*:\s*"((?:[^"\\]|\\.){50,5000})"/)
  if (descMatch?.[1]) {
    return descMatch[1]
      .replace(/\\u([0-9a-fA-F]{4})/g, (_, h) => String.fromCharCode(parseInt(h, 16)))
      .replace(/\\n/g, '<br>').replace(/\\r/g, '').replace(/\\t/g, ' ')
      .substring(0, 5000)
  }

  // Fallback to title-based description
  return `<p>${title}</p><p>Produit importé d'AliExpress. Description à compléter.</p>`
}

function buildProductData(
  title: string,
  price: number,
  images: string[],
  description: string,
  html: string,
  url: string
): ProductData {
  const vendor = html.match(/"storeName"\s*:\s*"([^"]+)"/)?.[1] || 
                 html.match(/"sellerName"\s*:\s*"([^"]+)"/)?.[1] || 
                 'AliExpress'

  const variants: ProductVariant[] = [{
    title: 'Default',
    price: price > 0 ? price : 9.99,
  }]

  return {
    title: title || 'Produit AliExpress',
    description: description || title || 'Description à compléter',
    price: price > 0 ? price : 9.99,
    compareAtPrice: Math.round((price > 0 ? price : 9.99) * 1.5 * 100) / 100,
    images: images.length > 0 ? images : [],
    variants,
    tags: ['aliexpress', 'dropshipping', 'import'],
    vendor,
    platform: 'aliexpress',
    sourceUrl: url,
  }
}

/**
 * Strategy 1: RapidAPI (requires API key)
 * Uses item_detail_3 endpoint for full product data
 */
const rapidApiStrategy: ScrapingStrategy = {
  name: 'RapidAPI',
  priority: 1,
  timeout: 15000,
  execute: async (productId: string, signal: AbortSignal) => {
    const apiKey = process.env.RAPIDAPI_KEY || process.env.ALIEXPRESS_API_KEY
    if (!apiKey) return null

    try {
      const response = await fetch(
        `https://aliexpress-datahub.p.rapidapi.com/item_detail_3?itemId=${productId}&currency=EUR&locale=en_US`,
        {
          signal,
          headers: {
            'X-RapidAPI-Key': apiKey,
            'X-RapidAPI-Host': 'aliexpress-datahub.p.rapidapi.com',
          },
        }
      )

      if (!response.ok || response.status === 403) return null

      const data = await response.json()
      const item = data?.result?.item

      if (!item?.title) return null

      const price = parseFloat(
        item?.sku?.def?.promotionPrice ||
        item?.sku?.def?.price ||
        item?.salePrice ||
        item?.originalPrice ||
        '0'
      ) || 0

      const rawImages = item?.imagePathList || item?.productImageList || item?.images || []
      const images = rawImages
        .map((i: string) => i.startsWith('http') ? i : 'https:' + i)
        .slice(0, 12)

      return buildProductData(
        item.title,
        price,
        images,
        item?.description || '',
        '',
        `https://www.aliexpress.com/item/${productId}.html`
      )
    } catch {
      return null
    }
  },
}

/**
 * Strategy 2: ScrapingBee headless browser (requires API key)
 * Executes JavaScript and waits for network idle
 */
const scrapingBeeStrategy: ScrapingStrategy = {
  name: 'ScrapingBee',
  priority: 2,
  timeout: 60000,
  execute: async (productId: string, signal: AbortSignal) => {
    const apiKey = process.env.SCRAPINGBEE_API_KEY || process.env.SCRAPINGBEE_KEY
    if (!apiKey) return null

    try {
      const params = new URLSearchParams({
        api_key: apiKey,
        url: `https://www.aliexpress.com/item/${productId}.html`,
        render_js: 'true',
        wait_browser: 'networkidle0',
        country_code: 'us',
        premium_proxy: 'false',
      })

      const response = await fetch(`https://app.scrapingbee.com/api/v1/?${params}`, { signal })
      if (!response.ok) return null

      const html = await response.text()
      const og = extractOgData(html)
      const title = extractTitle(html, og.title)
      
      if (!title || title.length < 5) return null

      const price = extractPrice(html)
      const images = extractImages(html, og.image)
      const description = extractDescription(html, title)

      return buildProductData(title, price, images, description, html, 
        `https://www.aliexpress.com/item/${productId}.html`)
    } catch {
      return null
    }
  },
}

/**
 * Strategy 3: Direct JSON endpoint (no auth required)
 * Tries multiple domain variations
 */
const jsonEndpointStrategy: ScrapingStrategy = {
  name: 'JSON Endpoint',
  priority: 3,
  timeout: 15000,
  execute: async (productId: string, signal: AbortSignal) => {
    const endpoints = [
      `https://www.aliexpress.com/item/${productId}.json`,
      `https://aliexpress.com/item/${productId}.json`,
      `https://m.aliexpress.com/item/${productId}.json`,
    ]

    for (const endpoint of endpoints) {
      try {
        const response = await fetch(endpoint, {
          signal,
          headers: {
            'Accept': 'application/json,text/html,*/*',
            'User-Agent': 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_5 like Mac OS X) AppleWebKit/605.1.15',
          },
        })

        if (!response.ok) continue

        const data = await response.json()
        const d = data?.data || data?.result || data

        const title = d?.titleModule?.subject || d?.title || d?.name || d?.ae_item_base_info_dto?.subject || ''
        if (!title || title.length < 5) continue

        const price = parseFloat(
          d?.priceModule?.minAmount?.value ||
          d?.priceModule?.minActivityAmount?.value ||
          d?.priceModule?.currentPrice?.value ||
          '0'
        ) || 0

        const rawImages = d?.imageModule?.imagePathList || d?.imagePathList || []
        const images = rawImages
          .slice(0, 12)
          .map((s: string) => s.startsWith('http') ? s : `https://${s.replace(/^\/\//, '')}`)

        return buildProductData(
          title,
          price,
          images,
          '',
          '',
          `https://www.aliexpress.com/item/${productId}.html`
        )
      } catch {
        continue
      }
    }

    return null
  },
}

/**
 * Strategy 4: Direct HTML fetch with multiple domains
 * Tries to bypass gateway redirects using alternative domains
 */
const htmlFetchStrategy: ScrapingStrategy = {
  name: 'Direct HTML',
  priority: 4,
  timeout: 20000,
  execute: async (productId: string, signal: AbortSignal) => {
    const urls = [
      `https://www.aliexpress.com/item/${productId}.html`,
      `https://m.aliexpress.com/item/${productId}.html`,
      `https://aliexpress.ru/item/${productId}.html`,
      `https://pt.aliexpress.com/item/${productId}.html`,
      `https://es.aliexpress.com/item/${productId}.html`,
    ]

    const desktopUA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36'
    const mobileUA = 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_5 like Mac OS X) AppleWebKit/605.1.15'

    for (const url of urls) {
      try {
        const { ok, html } = await safeFetch(url, 20000, { 'User-Agent': url.includes('m.aliexpress') ? mobileUA : desktopUA })
        if (!ok || html.length < 1000) continue

        // Check for bot/captcha pages
        if (/captcha|verify.*human|access.*denied|unusual.*traffic|cloudflare/i.test(html.substring(0, 2000))) {
          continue
        }

        const og = extractOgData(html)
        const title = extractTitle(html, og.title)
        if (!title || title.length < 5) continue

        const price = extractPrice(html)
        const images = extractImages(html, og.image)
        const description = extractDescription(html, title)

        return buildProductData(title, price, images, description, html, url)
      } catch {
        continue
      }
    }

    return null
  },
}

const STRATEGIES: ScrapingStrategy[] = [
  rapidApiStrategy,
  scrapingBeeStrategy,
  jsonEndpointStrategy,
  htmlFetchStrategy,
]

export async function importFromAliExpress(url: string, maxRetries: number = 3): Promise<ImportResult> {
  // Extract product ID
  const idMatch = 
    url.match(/\/item\/(\d+)/) ||
    url.match(/itemId=(\d+)/) ||
    url.match(/(\d{9,})/)
  
  const productId = idMatch?.[1]
  if (!productId) {
    return { success: false, url, error: 'URL AliExpress invalide - ID produit introuvable' }
  }

  let lastError: string | null = null
  let attempts = 0

  // Try each strategy in priority order
  for (const strategy of STRATEGIES) {
    attempts++
    console.log(`[AliExpress] Trying ${strategy.name} for product ${productId} (attempt ${attempts})`)

    try {
      const controller = new AbortController()
      const timeout = setTimeout(() => controller.abort(), strategy.timeout)
      
      const result = await strategy.execute(productId, controller.signal)
      clearTimeout(timeout)

      if (result && result.title && result.title.length > 5) {
        console.log(`[AliExpress] Success with ${strategy.name}`)
        return { success: true, url, product: result }
      }
    } catch (error) {
      lastError = error instanceof Error ? error.message : 'Erreur inconnue'
      console.warn(`[AliExpress] ${strategy.name} failed:`, lastError)
    }
  }

  // All strategies exhausted - return stub with retry info
  if (attempts < maxRetries) {
    return {
      success: false,
      url,
      error: `Échec après ${attempts} tentatives. Réessayez dans quelques instants.`,
    }
  }

  // Final fallback - return minimal stub for manual editing
  return {
    success: true,
    url,
    product: {
      title: `Produit AliExpress #${productId}`,
      description: 'Import AliExpress — données extraites automatiquement indisponibles. Veuillez compléter manuellement.',
      price: 9.99,
      compareAtPrice: 14.99,
      images: [],
      variants: [{ title: 'Default', price: 9.99 }],
      tags: ['aliexpress', 'dropshipping', 'manual'],
      vendor: 'AliExpress',
      platform: 'aliexpress',
      sourceUrl: url,
    },
  }
}
