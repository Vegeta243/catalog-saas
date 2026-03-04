// Rate limiter — prevents abuse on API routes
// Uses in-memory sliding window (can be upgraded to Redis)

interface RateLimitWindow {
  count: number;
  resetAt: number;
}

const windows = new Map<string, RateLimitWindow>();

interface RateLimitOptions {
  maxRequests: number;
  windowMs: number;
}

const DEFAULTS: Record<string, RateLimitOptions> = {
  "ai.generate": { maxRequests: 20, windowMs: 60 * 1000 },       // 20/min
  "shopify.products": { maxRequests: 30, windowMs: 60 * 1000 },   // 30/min
  "shopify.bulk": { maxRequests: 5, windowMs: 60 * 1000 },        // 5/min
  "scrape": { maxRequests: 10, windowMs: 60 * 1000 },             // 10/min
  "auth": { maxRequests: 5, windowMs: 15 * 60 * 1000 },           // 5/15min
  "default": { maxRequests: 60, windowMs: 60 * 1000 },            // 60/min
};

export interface RateLimitResult {
  allowed: boolean;
  remaining: number;
  resetAt: number;
}

export function checkRateLimit(userId: string, action: string): RateLimitResult {
  const opts = DEFAULTS[action] || DEFAULTS.default;
  const key = `${userId}:${action}`;
  const now = Date.now();

  let window = windows.get(key);

  if (!window || now > window.resetAt) {
    window = { count: 0, resetAt: now + opts.windowMs };
    windows.set(key, window);
  }

  window.count++;

  return {
    allowed: window.count <= opts.maxRequests,
    remaining: Math.max(0, opts.maxRequests - window.count),
    resetAt: window.resetAt,
  };
}

export function getRateLimitHeaders(result: RateLimitResult): Record<string, string> {
  return {
    "X-RateLimit-Remaining": String(result.remaining),
    "X-RateLimit-Reset": String(Math.ceil(result.resetAt / 1000)),
  };
}

// Cleanup old windows periodically
if (typeof setInterval !== "undefined") {
  setInterval(() => {
    const now = Date.now();
    for (const [key, window] of windows) {
      if (now > window.resetAt) windows.delete(key);
    }
  }, 60 * 1000);
}
