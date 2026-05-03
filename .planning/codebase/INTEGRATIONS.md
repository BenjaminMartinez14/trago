# External Integrations

**Analysis Date:** 2026-04-11

## APIs & External Services

**Payment Processing:**
- MercadoPago - Checkout and payment processing for Chile (CLP)
  - SDK/Client (server): `mercadopago` package; client instantiated in `src/lib/mercadopago.ts`
  - SDK/Client (browser): `@mercadopago/sdk-react` Brick component
  - Auth: `MP_ACCESS_TOKEN` (server), `NEXT_PUBLIC_MP_PUBLIC_KEY` (browser)
  - Webhook secret: `MP_WEBHOOK_SECRET`
  - Preference creation: `src/lib/mercadopago.ts` → `createPreference()`
  - Webhook handler: `src/app/api/webhooks/mp/route.ts` (POST `/api/webhooks/mp`)
  - Signature validation: HMAC-SHA256 on `id:<dataId>;request-id:<xRequestId>;ts:<ts>` manifest

**Messaging / Notifications:**
- Kapso (WhatsApp via Meta API) - Sends order-ready notifications to customers
  - Client: raw `fetch` to `https://api.kapso.ai/meta/whatsapp/v24.0/{phoneNumberId}/messages`
  - Implementation: `src/lib/kapso.ts` → `sendOrderReadyWhatsApp()`
  - Auth: `KAPSO_API_KEY` header (`X-API-Key`), `KAPSO_PHONE_NUMBER_ID`
  - Template: `order_confirmation` (language: `es_AR`)
  - Integration is optional — silently skipped if env vars are absent

**Fonts:**
- Google Fonts (via `next/font/google`) - Poppins and Righteous loaded at build time
  - Usage: `src/app/layout.tsx`

## Data Storage

**Databases:**
- Supabase (PostgreSQL) - Primary database
  - Connection: `NEXT_PUBLIC_SUPABASE_URL` + `SUPABASE_SERVICE_ROLE_KEY` (server) or `NEXT_PUBLIC_SUPABASE_ANON_KEY` (browser/SSR)
  - Client (browser): `src/lib/supabase/client.ts` → `createBrowserClient` from `@supabase/ssr`
  - Client (server/anon): `src/lib/supabase/server.ts` → `createClient()` (cookie-based)
  - Client (server/privileged): `src/lib/supabase/server.ts` → `createServiceClient()` (service role, no cache)
  - Types: hand-authored in `src/lib/supabase/types.ts` matching migration schema
  - Schema managed via `supabase/migrations/` (8 migration files)
  - Tables: `venues`, `categories`, `products`, `orders`, `order_items`, `staff_users`, `qr_codes`, `stations`

**File Storage:**
- Supabase Storage - Product images
  - Images served from `*.supabase.co/storage/`
  - Remote pattern allowed in `next.config.mjs` (`remotePatterns`)
  - Cached by PWA service worker (CacheFirst, 24h TTL)

**Caching:**
- Workbox service worker (browser-side) - Configured in `next.config.mjs`
  - Strategies: CacheFirst (static assets, product images), StaleWhileRevalidate (menu data, page navigations), NetworkFirst (order status polling), NetworkOnly (all other `/api/*`)

## Authentication & Identity

**Dashboard Auth (admin):**
- Supabase Auth - Cookie-based session management
  - Implementation: `src/middleware.ts` guards `/dashboard/**` routes via `supabase.auth.getUser()`
  - Redirects unauthenticated users to `/dashboard/login`
  - Login page: `src/app/dashboard/login/page.tsx`

**Staff Auth (custom):**
- Custom JWT — 4-digit PIN → bcrypt verify → HS256 JWT signed with `STAFF_JWT_SECRET`
  - Implementation: `src/lib/staff-auth.ts` using `jose`
  - Token TTL: 12 hours
  - Login endpoint: `src/app/api/staff/login/route.ts`
  - Token carried as `Authorization: Bearer <token>` on staff API calls
  - Staff routes verify token via `verifyStaffToken()` / `getStaffTokenFromRequest()`

## Monitoring & Observability

**Error Tracking:**
- Not detected (no Sentry, Datadog, or similar SDK present)

**Logs:**
- `console.error` / `console.warn` used directly in API routes and lib files (e.g., `src/app/api/webhooks/mp/route.ts`, `src/lib/kapso.ts`)
- No structured logging library detected

## CI/CD & Deployment

**Hosting:**
- Not configured in repo; compatible with Vercel (Next.js 14 App Router)

**CI Pipeline:**
- Not detected (no `.github/workflows/`, no CI config files)

## Environment Configuration

**Required env vars (app will break without these):**
- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `SUPABASE_SERVICE_ROLE_KEY`
- `NEXT_PUBLIC_MP_PUBLIC_KEY`
- `MP_ACCESS_TOKEN`
- `MP_WEBHOOK_SECRET`
- `STAFF_JWT_SECRET`
- `NEXT_PUBLIC_BASE_URL`

**Optional env vars (features silently disabled):**
- `KAPSO_API_KEY` - WhatsApp order-ready notifications
- `KAPSO_PHONE_NUMBER_ID` - WhatsApp phone number for Kapso

**Secrets location:**
- `.env.local` (gitignored)
- Example file: `.env.local.example`

## Webhooks & Callbacks

**Incoming:**
- `POST /api/webhooks/mp` - MercadoPago payment status notifications
  - Handler: `src/app/api/webhooks/mp/route.ts`
  - Validates HMAC-SHA256 signature from `x-signature` header
  - Maps MP payment status (`approved`/`rejected`/`cancelled`) → order status (`paid`/`cancelled`)
  - Triggers Supabase Realtime broadcast automatically via DB update

**Outgoing:**
- MercadoPago preference `notification_url` set to `{NEXT_PUBLIC_BASE_URL}/api/webhooks/mp`
- MercadoPago `back_urls` for redirect after checkout:
  - Success/Pending: `/{venueSlug}/order/{orderId}`
  - Failure: `/{venueSlug}/checkout`

## Realtime

- Supabase Realtime - Live order status updates to customer-facing order tracking
  - Used in: `src/hooks/useOrderStatus.ts`
  - Channel: `order-status-{orderId}`, listens for `UPDATE` on `public.orders` table filtered by `id`
  - Fallback: HTTP polling every 3s (`POLL_INTERVAL_MS`) if Realtime is unavailable
  - Replica identity configured for orders table via `supabase/migrations/007_orders_replica_identity.sql`

---

*Integration audit: 2026-04-11*
