import type { ImportResult } from './types'
import { detectPlatform } from './utils'
import { importFromAliExpress } from './aliexpress'
import { importFromCJDropshipping } from './cjdropshipping'
import { importFromDHgate } from './dhgate'
import { importFromAlibaba } from './alibaba'
import { importFromBanggood } from './banggood'
import { importUniversal } from './universal'

export type { ProductData, ImportResult } from './types'
export { detectPlatform } from './utils'

export async function importProduct(url: string): Promise<ImportResult> {
  const platform = detectPlatform(url)
  console.log(`[import] platform=${platform} url=${url.slice(0, 60)}`)
  try {
    switch (platform) {
      case 'aliexpress': return await importFromAliExpress(url)
      case 'cjdropshipping': return await importFromCJDropshipping(url)
      case 'dhgate': return await importFromDHgate(url)
      case 'alibaba': return await importFromAlibaba(url)
      case 'banggood': return await importFromBanggood(url)
      default: return await importUniversal(url)
    }
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : 'Erreur inconnue'
    return { success: false, url, error: msg }
  }
}

export async function importProducts(
  urls: string[],
  onProgress?: (done: number, total: number) => void
): Promise<ImportResult[]> {
  const results: ImportResult[] = []
  for (let i = 0; i < urls.length; i++) {
    results.push(await importProduct(urls[i]))
    onProgress?.(i + 1, urls.length)
    if (i < urls.length - 1)
      await new Promise(r => setTimeout(r, 300))
  }
  return results
}
