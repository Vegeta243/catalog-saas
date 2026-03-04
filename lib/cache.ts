// Simple in-memory cache with TTL for Shopify API responses
// Reduces redundant API calls and Shopify rate limit hits

interface CacheEntry<T> {
  data: T;
  expiresAt: number;
}

class APICache {
  private cache = new Map<string, CacheEntry<unknown>>();
  private defaultTTL: number;

  constructor(defaultTTLms = 5 * 60 * 1000) { // 5 minutes default
    this.defaultTTL = defaultTTLms;
  }

  get<T>(key: string): T | null {
    const entry = this.cache.get(key);
    if (!entry) return null;
    if (Date.now() > entry.expiresAt) {
      this.cache.delete(key);
      return null;
    }
    return entry.data as T;
  }

  set<T>(key: string, data: T, ttlMs?: number): void {
    this.cache.set(key, {
      data,
      expiresAt: Date.now() + (ttlMs ?? this.defaultTTL),
    });
  }

  invalidate(key: string): void {
    this.cache.delete(key);
  }

  invalidatePattern(pattern: string): void {
    for (const key of this.cache.keys()) {
      if (key.includes(pattern)) {
        this.cache.delete(key);
      }
    }
  }

  clear(): void {
    this.cache.clear();
  }

  get size(): number {
    return this.cache.size;
  }
}

// Singleton instances
export const shopifyCache = new APICache(5 * 60 * 1000);  // 5 min for products
export const aiCache = new APICache(30 * 60 * 1000);       // 30 min for AI results

// Cache key helpers
export function shopifyCacheKey(shopUrl: string, endpoint: string, params?: Record<string, string>): string {
  const paramStr = params ? "?" + new URLSearchParams(params).toString() : "";
  return `shopify:${shopUrl}:${endpoint}${paramStr}`;
}

export function aiCacheKey(productId: string, type: string, language: string): string {
  return `ai:${productId}:${type}:${language}`;
}
