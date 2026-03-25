import type { ImportResult } from './types'
import { detectPlatform } from './utils'
import { importFromAliExpress } from './aliexpress'
import { importFromCJDropshipping } from './cjdropshipping'
import { importFromDHgate } from './dhgate'
import { importFromAlibaba } from './alibaba'
import { importFromBanggood } from './banggood'
import { importUniversal } from './universal'

export async function importProduct(url: string): Promise<ImportResult> {
  const platform = detectPlatform(url)
  console.log(`[Import] Platform: ${platform} | URL: ${url}`)

  switch (platform) {
    case 'aliexpress':
      return importFromAliExpress(url)
    case 'cjdropshipping':
      return importFromCJDropshipping(url)
    case 'dhgate':
      return importFromDHgate(url)
    case 'alibaba':
      return importFromAlibaba(url)
    case 'banggood':
      return importFromBanggood(url)
    default:
      return importUniversal(url)
  }
}

export async function importProducts(
  urls: string[],
  onProgress?: (done: number, total: number) => void
): Promise<ImportResult[]> {
  const results: ImportResult[] = []
  const CONCURRENCY = 3

  for (let i = 0; i < urls.length; i += CONCURRENCY) {
    const batch = urls.slice(i, i + CONCURRENCY)
    const batchResults = await Promise.all(batch.map(url => importProduct(url)))
    results.push(...batchResults)
    onProgress?.(Math.min(i + CONCURRENCY, urls.length), urls.length)

    if (i + CONCURRENCY < urls.length) {
      await new Promise(r => setTimeout(r, 500))
    }
  }

  return results
}

export { detectPlatform } from './utils'
export type { ProductData, ImportResult } from './types'
