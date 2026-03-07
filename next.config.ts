import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // sharp is a native Node.js addon — must not be bundled by webpack
  serverExternalPackages: ["sharp"],

  async headers() {
    return [
      // ── Shopify embed routes: allow framing from Shopify admin ──
      {
        source: "/shopify-embed(.*)",
        headers: [
          // Shopify App Bridge requires the app to be embeddable inside admin.shopify.com
          { key: "X-Frame-Options", value: "ALLOWALL" },
          {
            key: "Content-Security-Policy",
            value: [
              "default-src 'self'",
              "script-src 'self' 'unsafe-eval' 'unsafe-inline' https://accounts.google.com https://js.stripe.com https://cdn.shopify.com",
              "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com https://cdn.shopify.com",
              "img-src 'self' data: blob: https:",
              "font-src 'self' https://fonts.gstatic.com https://cdn.shopify.com",
              "connect-src 'self' https://*.supabase.co https://api.stripe.com https://api.openai.com wss://*.supabase.co https://*.myshopify.com https://cdn.shopify.com",
              "frame-ancestors https://admin.shopify.com https://*.myshopify.com",
              "frame-src https://accounts.google.com https://js.stripe.com https://admin.shopify.com",
              "object-src 'none'",
              "base-uri 'self'",
            ].join("; "),
          },
        ],
      },
      // ── Dashboard routes: also embeddable inside Shopify admin ──
      {
        source: "/dashboard(.*)",
        headers: [
          { key: "X-Frame-Options", value: "ALLOWALL" },
          {
            key: "Content-Security-Policy",
            value: [
              "default-src 'self'",
              "script-src 'self' 'unsafe-eval' 'unsafe-inline' https://accounts.google.com https://js.stripe.com https://cdn.shopify.com",
              "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
              "img-src 'self' data: blob: https:",
              "font-src 'self' https://fonts.gstatic.com",
              "connect-src 'self' https://*.supabase.co https://api.stripe.com https://api.openai.com wss://*.supabase.co https://*.myshopify.com https://cdn.shopify.com",
              "frame-ancestors https://admin.shopify.com https://*.myshopify.com",
              "frame-src https://accounts.google.com https://js.stripe.com https://admin.shopify.com",
              "object-src 'none'",
              "base-uri 'self'",
            ].join("; "),
          },
        ],
      },
      // ── All other pages: strict security (no Shopify framing needed) ──
      {
        source: "/((?!dashboard|shopify-embed).*)",
        headers: [
          { key: "X-Frame-Options", value: "DENY" },
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "X-XSS-Protection", value: "1; mode=block" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          { key: "X-DNS-Prefetch-Control", value: "on" },
          { key: "Strict-Transport-Security", value: "max-age=63072000; includeSubDomains; preload" },
          { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=(), interest-cohort=()" },
          {
            key: "Content-Security-Policy",
            value: [
              "default-src 'self'",
              "script-src 'self' 'unsafe-eval' 'unsafe-inline' https://accounts.google.com https://js.stripe.com",
              "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
              "img-src 'self' data: blob: https:",
              "font-src 'self' https://fonts.gstatic.com",
              "connect-src 'self' https://*.supabase.co https://api.stripe.com https://api.openai.com wss://*.supabase.co",
              "frame-src https://accounts.google.com https://js.stripe.com",
              "object-src 'none'",
              "base-uri 'self'",
            ].join("; "),
          },
        ],
      },
    ];
  },
};

export default nextConfig;

