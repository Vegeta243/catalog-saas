import type { NextConfig } from "next";

// eslint-disable-next-line @typescript-eslint/no-require-imports
const withPWA = require("next-pwa")({
  dest: "public",
  register: true,
  skipWaiting: true,
  disable: process.env.NODE_ENV === "development",
  runtimeCaching: [
    {
      urlPattern: /^https:\/\/fonts\.(?:googleapis|gstatic)\.com\/.*/i,
      handler: "CacheFirst",
      options: {
        cacheName: "google-fonts",
        expiration: { maxEntries: 4, maxAgeSeconds: 365 * 24 * 60 * 60 },
      },
    },
    {
      urlPattern: /\.(?:eot|otf|ttc|ttf|woff|woff2|font\.css)$/i,
      handler: "StaleWhileRevalidate",
      options: { cacheName: "static-font-assets" },
    },
    {
      urlPattern: /\.(?:jpg|jpeg|gif|png|svg|ico|webp)$/i,
      handler: "StaleWhileRevalidate",
      options: {
        cacheName: "static-image-assets",
        expiration: { maxEntries: 64, maxAgeSeconds: 24 * 60 * 60 },
      },
    },
    {
      urlPattern: /\/_next\/static.+\.js$/i,
      handler: "CacheFirst",
      options: {
        cacheName: "next-static-js-assets",
        expiration: { maxEntries: 64, maxAgeSeconds: 24 * 60 * 60 },
      },
    },
    {
      urlPattern: /\/_next\/image\?url=.+$/i,
      handler: "StaleWhileRevalidate",
      options: {
        cacheName: "next-image",
        expiration: { maxEntries: 64, maxAgeSeconds: 24 * 60 * 60 },
      },
    },
    {
      urlPattern: /\.(?:mp3|wav|ogg)$/i,
      handler: "CacheFirst",
      options: { cacheName: "static-audio-assets" },
    },
    {
      urlPattern: /\.(?:mp4)$/i,
      handler: "CacheFirst",
      options: { cacheName: "static-video-assets" },
    },
    {
      urlPattern: /\.(?:js)$/i,
      handler: "StaleWhileRevalidate",
      options: { cacheName: "static-js-assets" },
    },
    {
      urlPattern: /\.(?:css|less)$/i,
      handler: "StaleWhileRevalidate",
      options: { cacheName: "static-style-assets" },
    },
    {
      urlPattern: /\/_next\/data\/.+\/.+\.json$/i,
      handler: "StaleWhileRevalidate",
      options: { cacheName: "next-data" },
    },
    {
      urlPattern: /\.(?:json|xml|csv)$/i,
      handler: "NetworkFirst",
      options: {
        cacheName: "static-data-assets",
        expiration: { maxEntries: 32, maxAgeSeconds: 24 * 60 * 60 },
      },
    },
    {
      urlPattern: ({ url }: { url: URL }) => {
        const isSameOrigin = self.origin === url.origin;
        if (!isSameOrigin) return false;
        const pathname = url.pathname;
        if (pathname.startsWith("/api/")) return false;
        return true;
      },
      handler: "NetworkFirst",
      options: {
        cacheName: "others",
        expiration: { maxEntries: 32, maxAgeSeconds: 24 * 60 * 60 },
        networkTimeoutSeconds: 10,
      },
    },
    {
      urlPattern: ({ url }: { url: URL }) => {
        const isSameOrigin = self.origin === url.origin;
        return !isSameOrigin;
      },
      handler: "NetworkFirst",
      options: {
        cacheName: "cross-origin",
        expiration: { maxEntries: 32, maxAgeSeconds: 60 * 60 },
        networkTimeoutSeconds: 10,
      },
    },
  ],
});

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
              "form-action 'self'",
              "object-src 'none'",
              "base-uri 'self'",
              "upgrade-insecure-requests",
            ].join("; "),
          },
        ],
      },
      // ── Dashboard routes: allow framing only from same origin ──
      {
        source: "/dashboard(.*)",
        headers: [
          { key: "X-Frame-Options", value: "SAMEORIGIN" },
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "X-XSS-Protection", value: "1; mode=block" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          { key: "X-DNS-Prefetch-Control", value: "on" },
          { key: "Strict-Transport-Security", value: "max-age=63072000; includeSubDomains; preload" },
          {
            key: "Permissions-Policy",
            value: [
              "camera=()",
              "microphone=()",
              "geolocation=()",
              "interest-cohort=()",
              "payment=(self)",
              "usb=()",
              "bluetooth=()",
              "accelerometer=()",
              "gyroscope=()",
              "magnetometer=()",
              "ambient-light-sensor=()",
              "autoplay=(self)",
              "fullscreen=(self)",
            ].join(", "),
          },
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
              "form-action 'self'",
              "object-src 'none'",
              "base-uri 'self'",
              "upgrade-insecure-requests",
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
          {
            key: "Permissions-Policy",
            value: [
              "camera=()",
              "microphone=()",
              "geolocation=()",
              "interest-cohort=()",
              "payment=(self)",
              "usb=()",
              "bluetooth=()",
              "accelerometer=()",
              "gyroscope=()",
              "magnetometer=()",
              "ambient-light-sensor=()",
              "autoplay=(self)",
              "fullscreen=(self)",
            ].join(", "),
          },
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
              "form-action 'self'",
              "object-src 'none'",
              "base-uri 'self'",
              "upgrade-insecure-requests",
            ].join("; "),
          },
        ],
      },
    ];
  },
};

export default withPWA(nextConfig);

