import withPWA from "@ducanh2912/next-pwa";

/** @type {import('next').NextConfig} */
const nextConfig = {
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "*.supabase.co",
      },
    ],
  },
};

// Workbox runtime caching strategies (section 9 of spec)
// Order matters: first match wins — specific patterns before broad ones.
const runtimeCaching = [
  // ── Order status polling: NetworkFirst with 3s timeout ─────────────────────
  // Allows the confirmation screen to show last-known status when offline.
  {
    urlPattern: /\/api\/orders\/[^/]+\/status/i,
    handler: "NetworkFirst",
    options: {
      cacheName: "order-status",
      networkTimeoutSeconds: 3,
      expiration: { maxEntries: 50, maxAgeSeconds: 60 },
      cacheableResponse: { statuses: [0, 200] },
    },
  },

  // ── All other /api/* routes: NetworkOnly ───────────────────────────────────
  // Orders and payments must always hit the server; never serve stale.
  {
    urlPattern: /\/api\/.*/i,
    handler: "NetworkOnly",
  },

  // ── Supabase Storage (product images): CacheFirst, TTL 24h ────────────────
  // Images rarely change mid-event; saves bandwidth on slow venue wifi.
  {
    urlPattern: /^https:\/\/[^/]+\.supabase\.co\/storage\/.*/i,
    handler: "CacheFirst",
    options: {
      cacheName: "product-images",
      expiration: {
        maxEntries: 200,
        maxAgeSeconds: 24 * 60 * 60,
      },
      cacheableResponse: { statuses: [0, 200] },
    },
  },

  // ── Supabase REST API (menu data): StaleWhileRevalidate ───────────────────
  // Show cached menu instantly, revalidate in the background.
  // Customer always sees something even on flaky venue wifi.
  {
    urlPattern: /^https:\/\/[^/]+\.supabase\.co\/rest\/.*/i,
    handler: "StaleWhileRevalidate",
    options: {
      cacheName: "supabase-menu",
      expiration: {
        maxEntries: 100,
        maxAgeSeconds: 60 * 60,
      },
      cacheableResponse: { statuses: [0, 200] },
    },
  },

  // ── Next.js static assets (JS, CSS, fonts): CacheFirst ────────────────────
  // Build-hashed filenames — immutable after deploy.
  {
    urlPattern: /\/_next\/static\/.*/i,
    handler: "CacheFirst",
    options: {
      cacheName: "next-static-assets",
      expiration: {
        maxEntries: 500,
        maxAgeSeconds: 365 * 24 * 60 * 60,
      },
      cacheableResponse: { statuses: [0, 200] },
    },
  },

  // ── Next.js image optimization endpoint: CacheFirst ───────────────────────
  {
    urlPattern: /\/_next\/image\?.*/i,
    handler: "CacheFirst",
    options: {
      cacheName: "next-images",
      expiration: {
        maxEntries: 100,
        maxAgeSeconds: 24 * 60 * 60,
      },
      cacheableResponse: { statuses: [0, 200] },
    },
  },

  // ── Page navigations (HTML): StaleWhileRevalidate ─────────────────────────
  // Show cached menu page instantly while fetching fresh data in background.
  // Critical for offline-first: customer can browse menu with no wifi.
  {
    urlPattern: /^https?:\/\/.+\/((?!api\/).)*$/i,
    handler: "StaleWhileRevalidate",
    options: {
      cacheName: "pages",
      expiration: {
        maxEntries: 30,
        maxAgeSeconds: 24 * 60 * 60,
      },
      cacheableResponse: { statuses: [0, 200] },
    },
  },
];

export default withPWA({
  dest: "public",
  register: true,
  skipWaiting: true,
  disable: process.env.NODE_ENV === "development",
  workboxOptions: {
    runtimeCaching,
  },
})(nextConfig);
