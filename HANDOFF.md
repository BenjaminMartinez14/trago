# Trago — Build Handoff

> **Read this file at the start of every new session before touching any code.**
> Full spec is in `SPEC.md`. This file tracks what's done, what's next, and key decisions.

---

## Current status

| Phase | Prompt | Status |
|-------|--------|--------|
| 1 — Scaffold | 1.1 Init project | ✅ Done |
| 1 — Scaffold | 1.2 Database schema | ✅ Done |
| 2 — Menu PWA | 2.1 Menu UI | ✅ Done |
| 2 — Menu PWA | 2.2 Cart + offline | ✅ Done |
| 3 — Checkout | 3.1 Order API route | ✅ Done |
| 3 — Checkout | 3.2 Payment UI | ✅ Done |
| 3 — Checkout | 3.3 Webhook + confirmation | ✅ Done |
| 4 — Staff scanner | 4.1 Scanner | ✅ Done |
| 5 — Admin dashboard | 5.1 Admin dashboard | ✅ Done |

**All MVP phases complete. Post-MVP improvements in progress.**

| Post-MVP | Feature | Status |
|----------|---------|--------|
| — | Persistent QR codes in dashboard | ✅ Done |
| — | Live order queue + strict status flow | ✅ Done |
| — | Supabase Storage bucket (product-images) | ✅ Done |
| — | Supabase Auth admin user | ✅ Done |
| — | Mercado Pago Wallet Brick rendering | ✅ Fixed |
| — | Venue stations (zones) | 🔧 In progress |

### Active work: Venue Stations

**Goal:** Different zones within a venue (e.g., "Barra VIP", "Terraza") each with their own QR and filtered product menu.

**Done:**
- Migration `005_stations.sql` — `stations` + `station_products` tables + `qr_codes.station_id` column
- Types updated in `src/lib/supabase/types.ts`
- API routes: `api/dashboard/stations/` (CRUD) + `api/dashboard/stations/[id]/products/` (GET + PUT)

**Still needed:**
1. **Run migration** `005_stations.sql` in Supabase SQL editor
2. **Dashboard stations page** (`src/app/dashboard/stations/page.tsx`) — CRUD stations, assign products per station
3. **Dashboard nav** — add "Estaciones" link to `src/app/dashboard/DashboardNav.tsx`
4. **QR generator update** — pick from stations dropdown instead of raw slug input, URL = `/{venue}?s={station-slug}`
5. **Menu page** (`src/app/[venue]/page.tsx`) — if `?s=` param: filter products via `station_products` join; if no `?s=`: show station picker

**URL format:** `trago-app.vercel.app/club-demo?s=barra-vip`

**Plan file:** `~/.claude/plans/crystalline-sprouting-catmull.md`

---

## Deployment state

- **Repo:** https://github.com/BenjaminMartinez14/trago
- **Vercel project:** `benjaminmartinez14s-projects/trago`
- **Production URL (stable alias):** https://trago-app.vercel.app
- **Supabase project:** `mdjyubpurjhgnunxgunt` → https://mdjyubpurjhgnunxgunt.supabase.co
- **Migrations:** All 3 run (schema + RLS + seed data)
- **PWA:** Fixed — switched from `next-pwa` to `@ducanh2912/next-pwa` (Next.js 14 compatibility)

### Important: stable alias must be manually updated after each deploy
After every `git push`, Vercel creates a new deployment URL. The stable alias
`trago-app.vercel.app` does NOT auto-update. You must run:
```
vercel alias set <new-deployment-url> trago-app.vercel.app
```
Or set up Vercel to auto-promote production deployments in the dashboard.

---

## Environment variables

All set in Vercel production (without trailing newlines) + `.env.local`:

| Variable | Status | Value |
|----------|--------|-------|
| `NEXT_PUBLIC_SUPABASE_URL` | ✅ Set | see .env.local |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | ✅ Set | see .env.local |
| `SUPABASE_SERVICE_ROLE_KEY` | ✅ Set | see .env.local |
| `NEXT_PUBLIC_MP_PUBLIC_KEY` | ✅ Set | TEST key — see .env.local |
| `MP_ACCESS_TOKEN` | ✅ Set | TEST key — see .env.local |
| `MP_WEBHOOK_SECRET` | ✅ Set | see .env.local |
| `STAFF_JWT_SECRET` | ✅ Set | see .env.local |
| `NEXT_PUBLIC_BASE_URL` | ✅ Set | `https://trago-app.vercel.app` |

### WARNING: env var newline bug
All env vars were originally set with a trailing `\n` (via `echo` piped to `vercel env add`).
This corrupted keys silently. **Always use `printf` instead of `echo`**:
```
printf 'value' | vercel env add VAR_NAME production
```

---

## What still needs to be done

### ~~1. Fix Mercado Pago Wallet Brick~~ ✅ Fixed
### ~~2. Create Supabase Storage bucket~~ ✅ Done
### ~~3. Create Supabase Auth admin user~~ ✅ Done (benjiturro77@gmail.com)

All original open items resolved. No blocking issues remaining.

---

## Bugs fixed this session

| Bug | Fix |
|-----|-----|
| Vercel build crash (`precacheFallback` undefined) | Switched from `next-pwa` to `@ducanh2912/next-pwa`, moved `runtimeCaching` inside `workboxOptions` |
| All env vars had trailing `\n` (corrupted MP public key, base URL, etc.) | Re-added all vars using `printf` instead of `echo` |
| `/api/orders` blocked by Vercel Deployment Protection | Disabled SSO protection via Vercel REST API |
| Venue `mp_access_token` was placeholder in DB | Updated via Supabase SQL editor |
| `NEXT_PUBLIC_BASE_URL` wrong (localhost) | Fixed to `https://trago-app.vercel.app` |
| Dashboard login redirect loop (ERR_TOO_MANY_REDIRECTS) | `DashboardLayout` was wrapping login page and redirecting unauthenticated users to login → loop. Fixed by setting `x-pathname` header in middleware and skipping auth check in layout when pathname is `/dashboard/login` |
| Stable alias stuck on old deployment | Must manually run `vercel alias set` after each deploy |

---

## Seed data (for testing)

- Venue: `club-demo` (slug), `a1b2c3d4-0000-0000-0000-000000000001` (id)
- Admin staff PIN: `1234`
- Scanner staff PIN: `0000`
- MP test card: `5031 7557 3453 0604`, any future expiry, CVV `123`, name `APRO`
- MP sandbox checkout: use `sandbox_init_point` URL from preference, not `init_point`

---

## Architecture decisions made

### TypeScript / Supabase types
- `@supabase/supabase-js` v2.99.3 uses PostgREST v12 — `.insert()` and `.update()` return `never` with hand-authored types.
- **Fix applied:** Cast `supabase` as `any` for mutating operations in server routes.
- Types file: `src/lib/supabase/types.ts`

### Supabase key format
- New Supabase key format: `sb_publishable_...` = anon key, `sb_secret_...` = service role key
- Code uses env var names `NEXT_PUBLIC_SUPABASE_ANON_KEY` and `SUPABASE_SERVICE_ROLE_KEY`

### Cart + session
- `CartProvider` generates UUID `sessionId` in `sessionStorage` (`SESSION_ID_KEY = 'trago_session_id'`)
- Sent as `sessionId` field in POST body to `/api/orders` (also sent as `x-session-id` header but not used server-side)

### Mercado Pago
- `@mercadopago/sdk-react` Wallet Brick: workaround `const W = Wallet as any`
- `initMercadoPago()` called at module level in `checkout/page.tsx`
- Webhook registered at: `https://trago-app.vercel.app/api/webhooks/mp` (Payment events)
- Webhook: HMAC-SHA256 signature validation (`ts=...,v1=...` format)

### Staff auth
- PIN stored as bcrypt hash in `staff_users.pin_hash`
- Staff JWT: HS256, 12h expiry, via `jose`
- Stored in `localStorage` as `trago_staff_session`

### PWA
- Switched from `next-pwa` to `@ducanh2912/next-pwa` for Next.js 14 compatibility
- SW disabled in development
- `runtimeCaching` moved inside `workboxOptions`

### Dashboard auth
- `middleware.ts` guards all `/dashboard/*` except `/dashboard/login`
- Middleware sets `x-pathname` response header so `DashboardLayout` can detect the login route and skip the auth redirect
- `DashboardLayout` wraps all dashboard pages including login — skips sidebar/auth when `x-pathname === /dashboard/login`

---

## Key file map

```
src/
  app/
    [venue]/
      layout.tsx              ← wraps CartProvider
      page.tsx                ← menu (server component)
      cart/page.tsx           ← cart page (client)
      checkout/page.tsx       ← checkout + Wallet Brick (client)
      order/[id]/page.tsx     ← confirmation + QR (client)
    dashboard/
      layout.tsx              ← server auth check + sidebar (skips for login)
      login/page.tsx          ← Supabase Auth login
      DashboardNav.tsx        ← sidebar nav with sign-out
      page.tsx                ← stats + QR generator
      menu/page.tsx           ← full CRUD products + categories + image upload
      orders/page.tsx         ← live orders table with Realtime
    staff/
      scan/page.tsx           ← staff scanner (login + QR + deliver)
    api/
      orders/route.ts
      orders/[id]/status/route.ts
      webhooks/mp/route.ts
      staff/login/route.ts
      staff/orders/[id]/route.ts
      staff/orders/[id]/deliver/route.ts
      dashboard/stats/route.ts
      dashboard/products/route.ts
      dashboard/products/[id]/route.ts
      dashboard/categories/route.ts
      dashboard/categories/[id]/route.ts
  lib/
    supabase/client.ts
    supabase/server.ts
    supabase/types.ts
    mercadopago.ts
    staff-auth.ts
    format.ts                 ← formatCLP()
    constants.ts
  middleware.ts               ← dashboard auth guard + x-pathname header
supabase/
  migrations/
    001_initial_schema.sql
    002_rls_policies.sql
    003_seed_data.sql
```

---

*Last updated: 2026-03-22. Dashboard login fixed. MP Wallet Brick not rendering is the main open issue.*
