export type ProductData = {
  title: string
  description: string
  price: number
  compareAtPrice?: number
  images: string[]
  variants: Array<{
    title: string
    price: number
    sku?: string
    inventory?: number
  }>
  tags: string[]
  vendor: string
  platform: string
  sourceUrl: string
  weight?: number
  category?: string
  specifications?: Record<string, string>
}

export type ImportResult = {
  success: boolean
  product?: ProductData
  error?: string
  url: string
}
