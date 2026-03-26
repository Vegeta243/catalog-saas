/**
 * lib/importers/index.ts
 * Main importer factory with enhanced scrapers and bulk import support
 */

import type { ImportResult } from './types'
import { detectPlatform } from './utils'
import { importFromAliExpress } from './aliexpress-enhanced'
import { 
  importFromAlibaba, 
  importFromCJDropshipping, 
  importFromDHgate, 
  importFromBanggood,
  importFromTemu 
} from './platforms'
import { importUniversal } from './universal'

export type { ProductData, ImportResult } from './types'
export { detectPlatform } from './utils'

/**
 * Import a single product from any supported platform
 * Automatically detects platform and uses the appropriate scraper
 */
export async function importProduct(url: string): Promise<ImportResult> {
  const platform = detectPlatform(url)
  console.log(`[import] platform=${platform} url=${url.slice(0, 60)}`)
  
  try {
    switch (platform) {
      case 'aliexpress': 
        return await importFromAliExpress(url)
      case 'cjdropshipping': 
        return await importFromCJDropshipping(url)
      case 'dhgate': 
        return await importFromDHgate(url)
      case 'alibaba': 
        return await importFromAlibaba(url)
      case 'banggood': 
        return await importFromBanggood(url)
      case 'temu': 
        return await importFromTemu(url)
      default: 
        return await importUniversal(url)
    }
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : 'Erreur inconnue'
    console.error(`[import] Error for ${url}:`, msg)
    return { success: false, url, error: msg }
  }
}

/**
 * Import multiple products in parallel with concurrency control
 * Returns results as they complete
 */
export async function importProducts(
  urls: string[],
  options?: {
    concurrency?: number
    onProgress?: (done: number, total: number, results: ImportResult[]) => void
    retryFailed?: boolean
    maxRetries?: number
  }
): Promise<ImportResult[]> {
  const {
    concurrency = 5,
    onProgress,
    retryFailed = true,
    maxRetries = 3,
  } = options || {}

  const results: ImportResult[] = []
  const queue = [...urls]
  let completed = 0

  async function processUrl(url: string, retryCount = 0): Promise<ImportResult> {
    try {
      const result = await importProduct(url)
      
      // Retry logic for failed imports
      if (!result.success && retryFailed && retryCount < maxRetries) {
        console.log(`[import] Retrying ${url} (attempt ${retryCount + 1}/${maxRetries})`)
        await new Promise(r => setTimeout(r, 1000 * (retryCount + 1))) // Exponential backoff
        return processUrl(url, retryCount + 1)
      }
      
      return result
    } catch (error) {
      if (retryFailed && retryCount < maxRetries) {
        console.log(`[import] Retrying ${url} after error (attempt ${retryCount + 1}/${maxRetries})`)
        await new Promise(r => setTimeout(r, 1000 * (retryCount + 1)))
        return processUrl(url, retryCount + 1)
      }
      return { 
        success: false, 
        url, 
        error: error instanceof Error ? error.message : 'Erreur inconnue' 
      }
    }
  }

  async function worker() {
    while (queue.length > 0) {
      const url = queue.shift()
      if (!url) continue

      const result = await processUrl(url)
      results.push(result)
      completed++

      onProgress?.(completed, urls.length, results)
    }
  }

  // Start concurrent workers
  const workers = Array.from({ length: Math.min(concurrency, urls.length) }, () => worker())
  await Promise.all(workers)

  return results
}

/**
 * Get import statistics for a batch of results
 */
export function getImportStats(results: ImportResult[]) {
  const successful = results.filter(r => r.success)
  const failed = results.filter(r => !r.success)
  
  return {
    total: results.length,
    successful: successful.length,
    failed: failed.length,
    successRate: results.length > 0 ? (successful.length / results.length) * 100 : 0,
    platforms: successful.reduce((acc, r) => {
      const platform = r.product?.platform || 'unknown'
      acc[platform] = (acc[platform] || 0) + 1
      return acc
    }, {} as Record<string, number>),
  }
}

/**
 * Validate URLs before import
 * Returns only valid URLs with detected platforms
 */
export function validateImportUrls(urls: string[]): Array<{ url: string; platform: string; valid: boolean }> {
  return urls.map(url => {
    const trimmed = url.trim()
    if (!trimmed.startsWith('http://') && !trimmed.startsWith('https://')) {
      return { url: trimmed, platform: 'unknown', valid: false }
    }
    
    const platform = detectPlatform(trimmed)
    const isValid = platform !== 'unknown' || trimmed.includes('.')
    
    return {
      url: trimmed,
      platform: platform === 'unknown' ? 'other' : platform,
      valid: isValid,
    }
  })
}

/**
 * Group URLs by platform for optimized batch processing
 */
export function groupUrlsByPlatform(urls: string[]): Record<string, string[]> {
  return urls.reduce((groups, url) => {
    const platform = detectPlatform(url)
    const key = platform === 'unknown' ? 'other' : platform
    if (!groups[key]) groups[key] = []
    groups[key].push(url)
    return groups
  }, {} as Record<string, string[]>)
}
