export interface ProductVariant {
  title: string
  price: number
  sku?: string
}

export interface ProductData {
  title: string
  description: string
  price: number
  compareAtPrice?: number
  images: string[]
  variants: ProductVariant[]
  tags: string[]
  vendor: string
  platform: string
  sourceUrl: string
}

export interface ImportResult {
  success: boolean
  product?: ProductData
  error?: string
  url: string
}
