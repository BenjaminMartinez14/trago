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

---

## All prompts complete — MVP done ✅

All 5 phases / 9 prompts are complete. The build is feature-complete per spec.

### What was built in 5.1
- `src/middleware.ts` — auth guard for `/dashboard/*`
- `src/app/dashboard/login/page.tsx` — Supabase Auth email+password login
- `src/app/dashboard/layout.tsx` — server auth check + sidebar nav
- `src/app/dashboard/DashboardNav.tsx` — sidebar with sign-out
- `src/app/dashboard/page.tsx` — stats cards + QR generator with download
- `src/app/dashboard/orders/page.tsx` — live orders table with Realtime
- `src/app/dashboard/menu/page.tsx` — full CRUD for products + categories, image upload to Storage
- `src/app/api/dashboard/stats/route.ts` — today's revenue, order count, top 3 products
- `src/app/api/dashboard/products/route.ts` — GET + POST
- `src/app/api/dashboard/products/[id]/route.ts` — PATCH + DELETE
- `src/app/api/dashboard/categories/route.ts` — GET + POST
- `src/app/api/dashboard/categories/[id]/route.ts` — PATCH + DELETE

---

## Architecture decisions made

### TypeScript / Supabase types
- `@supabase/supabase-js` v2.99.3 uses PostgREST v12 — `.insert()` and `.update()` return `never` with hand-authored types.
- **Fix applied:** Cast `supabase` as `any` for mutating operations in server routes. Reads (`.select()`) work fine with typed client.
- `.env.local.example` has `NEXT_PUBLIC_MP_PUBLIC_KEY` — needed for Wallet Brick `initMercadoPago()`.
- Types file is at `src/lib/supabase/types.ts` — replace with `supabase gen types` when project is linked.

### Cart + session
- `CartProvider` generates a UUID `sessionId` in `sessionStorage` on first load (`SESSION_ID_KEY = 'trago_session_id'`).
- `sessionId` passed as `x-session-id` header and in the POST body to `/api/orders`.

### Mercado Pago
- `@mercadopago/sdk-react` Wallet component has wrong TypeScript types for `initialization.preferenceId`. Worked around with `const W = Wallet as any`.
- `initMercadoPago(NEXT_PUBLIC_MP_PUBLIC_KEY)` called at module level in `checkout/page.tsx`.

### Staff auth
- PIN stored as bcrypt hash in `staff_users.pin_hash` (seeded via `003_seed_data.sql` with pgcrypto).
- Staff JWT signed with `STAFF_JWT_SECRET` (HS256, 12h expiry) via `jose`.
- JWT payload: `{ sub: staffId, venueId, role, name }`.
- Stored in `localStorage` as `trago_staff_session`.

### Workbox / PWA
- SW disabled in development (`NODE_ENV === 'development'`).
- `runtimeCaching` configured in `next.config.mjs` — see spec section 9 for strategies.

---

## Key file map

```
src/
  app/
    [venue]/
      layout.tsx              ← wraps CartProvider
      page.tsx                ← menu (server component)
      not-found.tsx
      cart/page.tsx           ← cart page (client)
      checkout/page.tsx       ← checkout + Wallet Brick (client)
      order/[id]/page.tsx     ← confirmation + QR (client)
    dashboard/
      layout.tsx              ← ⬜ auth guard + sidebar
      login/page.tsx          ← ⬜ login form
      page.tsx                ← ⬜ stats + QR generator
      menu/page.tsx           ← ⬜ menu CRUD
      orders/page.tsx         ← ⬜ live orders
    staff/
      scan/page.tsx           ← ✅ done
    api/
      orders/route.ts         ← POST create order + MP preference
      orders/[id]/status/route.ts  ← GET polling endpoint
      webhooks/mp/route.ts    ← POST MP webhook
      staff/
        login/route.ts        ← ✅ done
        orders/[id]/route.ts  ← ✅ done
        orders/[id]/deliver/route.ts  ← ✅ done
      dashboard/              ← ⬜ stats, products, categories
  components/
    menu/
      CartProvider.tsx        ← cart context + sessionId
      CartItemRow.tsx
      CategoryNav.tsx
      MenuClient.tsx          ← floating cart bar
      ProductCard.tsx
    ui/
      Button.tsx
      LoadingSpinner.tsx
  lib/
    supabase/client.ts
    supabase/server.ts        ← createClient() + createServiceClient()
    supabase/types.ts         ← hand-authored (replace with gen types)
    mercadopago.ts
    staff-auth.ts             ← ✅ done
    errors.ts
    constants.ts
    format.ts                 ← formatCLP()
  hooks/
    useCart.ts
    useOrderStatus.ts         ← Realtime + polling hybrid
    useOnlineStatus.ts
  middleware.ts               ← ⬜ dashboard auth guard
supabase/
  migrations/
    001_initial_schema.sql
    002_rls_policies.sql
    003_seed_data.sql
```

---

## Seed data (for local testing)

- Venue: `club-demo` (slug), `a1b2c3d4-0000-0000-0000-000000000001` (id)
- Admin staff: PIN `1234`
- Scanner staff: PIN `0000`

---

*Last updated: Prompt 4.1 complete. Next: Prompt 5.1 — Admin dashboard.*
