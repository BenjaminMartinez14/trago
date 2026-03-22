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

**All code is complete. Focus is now on infrastructure, deployment, and MP configuration.**

---

## Deployment state

- **Repo:** https://github.com/BenjaminMartinez14/trago
- **Vercel project:** `benjaminmartinez14s-projects/trago`
- **Production URL (stable alias):** https://trago-app.vercel.app
- **Latest deployment:** https://trago-h8b51jru1-benjaminmartinez14s-projects.vercel.app
- **Supabase project:** `mdjyubpurjhgnunxgunt` → https://mdjyubpurjhgnunxgunt.supabase.co
- **Migrations:** All 3 run (schema + RLS + seed data)
- **PWA:** Fixed — switched from `next-pwa` to `@ducanh2912/next-pwa` (Next.js 14 compatibility)

---

## Environment variables

All set in Vercel production + `.env.local`:

| Variable | Status | Value |
|----------|--------|-------|
| `NEXT_PUBLIC_SUPABASE_URL` | ✅ Set | see .env.local |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | ✅ Set | see .env.local |
| `SUPABASE_SERVICE_ROLE_KEY` | ✅ Set | see .env.local |
| `NEXT_PUBLIC_MP_PUBLIC_KEY` | ✅ Set | TEST key — see .env.local |
| `MP_ACCESS_TOKEN` | ✅ Set | TEST key — see .env.local |
| `MP_WEBHOOK_SECRET` | ✅ Set | see .env.local |
| `STAFF_JWT_SECRET` | ✅ Set | see .env.local |
| `NEXT_PUBLIC_BASE_URL` | ⚠️ Needs update | currently wrong — must be updated to `https://trago-app.vercel.app` |

---

## What still needs to be done

### 1. Update NEXT_PUBLIC_BASE_URL on Vercel ← DO THIS FIRST
Stable alias `https://trago-app.vercel.app` was created. Update the env var:
```
echo "https://trago-app.vercel.app" | vercel env add NEXT_PUBLIC_BASE_URL production --force
```
Then trigger redeploy: `git commit --allow-empty -m "chore: redeploy" && git push origin main`

### 2. Register MP webhook
In the MP developer dashboard, register webhook URL for **Payment** events:
`https://trago-app.vercel.app/api/webhooks/mp`
The `MP_WEBHOOK_SECRET` is already set in Vercel — it must match what MP shows in the dashboard.

### 3. Update venue mp_access_token in DB
The seed data has a placeholder. Run in Supabase SQL editor:
```sql
UPDATE venues
SET mp_access_token = '<MP_ACCESS_TOKEN from .env.local>'
WHERE slug = 'club-demo';
```

### 4. Create Supabase Auth admin user
No one can log into `/dashboard` yet. Go to:
Supabase Dashboard → Authentication → Users → Add user (email + password)

### 5. Create Supabase Storage bucket
Image upload in the menu manager needs a public bucket named `product-images`.
Supabase Dashboard → Storage → New bucket → name: `product-images` → Public: ON

---

## Seed data (for testing)

- Venue: `club-demo` (slug), `a1b2c3d4-0000-0000-0000-000000000001` (id)
- Admin staff PIN: `1234`
- Scanner staff PIN: `0000`
- MP test card: `5031 7557 3453 0604`, any future expiry, CVV `123`, name `APRO`

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
- Passed as `x-session-id` header to `/api/orders`

### Mercado Pago
- `@mercadopago/sdk-react` Wallet Brick: workaround `const W = Wallet as any`
- `initMercadoPago()` called at module level in `checkout/page.tsx`
- Webhook: HMAC-SHA256 signature validation (`ts=...,v1=...` format)

### Staff auth
- PIN stored as bcrypt hash in `staff_users.pin_hash`
- Staff JWT: HS256, 12h expiry, via `jose`
- Stored in `localStorage` as `trago_staff_session`

### PWA
- Switched from `next-pwa` to `@ducanh2912/next-pwa` for Next.js 14 compatibility
- SW disabled in development
- `runtimeCaching` moved inside `workboxOptions`

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
      layout.tsx              ← server auth check + sidebar
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
  middleware.ts               ← dashboard auth guard
supabase/
  migrations/
    001_initial_schema.sql
    002_rls_policies.sql
    003_seed_data.sql
```

---

*Last updated: Stable alias trago-app.vercel.app created. Resume at item 1 above.*
