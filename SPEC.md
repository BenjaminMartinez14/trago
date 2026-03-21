# TRAGO

**Technical Specification — v0.2 MVP**

Mobile ordering SaaS for nightclubs — Chile

*March 2026 — Confidential*

---

## 1. Product overview

Trago is a B2B SaaS platform that enables nightclubs to let their customers browse a digital menu, order drinks, and pay — all from their phones via a QR code at the bar, without standing in line.

The core value proposition targets two parties:

- **Venues:** more revenue per peak hour, less staff saturation, real-time analytics.
- **Customers:** order and pay in under 60 seconds without leaving the dance floor.

> **Key differentiators vs. Kicket and generic solutions**
>
> - Apple Pay + Google Pay via Mercado Pago — zero card friction in dark/loud environments
> - Nightclub-first UX: dark mode, large tap targets, single-thumb flow
> - Commission-based pricing — zero upfront cost lowers sales barrier for venue onboarding
> - Chile-native payment stack (CLP, local compliance, local support)

---

## 2. Target market

### Primary segment (MVP)

- High-volume nightclubs in Santiago, Chile (Bosque Luz tier and above)
- Venues with 300+ capacity and 2+ bar stations
- Weekly events (Fri–Sat) with predictable peak hours

### Go-to-market priority

Focus on a single pilot venue before building any commercial sales motion. The goal of the pilot is to generate a real transaction dataset and a video testimonial, not revenue.

> **⚠️ Critical risk: venue wifi**
>
> Nightclubs operate at full capacity with dense RF interference. The PWA must be designed offline-first: menu data cached on device, payment confirmation retried automatically on reconnect. This is a day-one technical constraint, not a future optimization.

---

## 3. User roles

| Role | Description | Access |
|------|-------------|--------|
| **Customer** | End-user scanning QR at the bar | Public menu URL — no login required |
| **Bar staff / Scanner** | Scans order QR to confirm pickup | Staff app — PIN login |
| **Venue admin** | Manages menu, prices, analytics | Dashboard — email + password |
| **Super admin** | Trago operator managing all venues | Internal admin panel |

---

## 4. Core customer flow (MVP)

1. Customer scans QR code placed at the bar counter.
2. Browser opens the venue's menu as a PWA (no app install required).
3. Customer browses categories, adds items to cart.
4. Checkout screen shows total in CLP.
5. Customer pays via Apple Pay, Google Pay, or card through Mercado Pago.
6. On payment success: order confirmation screen with order number + QR code.
7. Customer shows QR at bar. Staff scans it with the staff app.
8. Staff marks order as delivered. Customer flow ends.

*No account creation required for customers.* Order history is ephemeral per session. A **session_id** (UUID stored in sessionStorage) ties the browser to its orders.

---

## 5. Feature scope

### 5.1 MVP (must ship to pilot)

| Feature | Detail | Priority | Phase |
|---------|--------|----------|-------|
| **Digital menu (PWA)** | Categories, products, prices, images, stock toggle | P0 | 2 |
| **Cart + checkout** | Multi-item cart, CLP totals, order notes field | P0 | 2 |
| **Mercado Pago integration** | Wallet Brick (Apple Pay + Google Pay + card + WebPay) | P0 | 3 |
| **Order confirmation** | QR code + order number on success screen | P0 | 3 |
| **Staff scanner app** | Camera QR scan to mark order delivered | P0 | 4 |
| **Venue admin dashboard** | Menu CRUD, live orders view, basic daily sales | P0 | 5 |
| **Offline-resilient menu** | Cache-first for assets, stale-while-revalidate for menu data via Workbox | P0 | 2 |
| **QR code generator** | Per-venue QR linking to their menu URL | P1 | 5 |
| **Product availability toggle** | Staff can mark items 86'd in real time | P1 | 4 |
| **Sound notification** | New order alert for staff panel | P1 | 4 |

### 5.2 Post-MVP (do not build yet)

- Table-mode (QR per table with open tab)
- Analytics dashboard (top products, hourly trends, ticket average)
- Combo / promo engine
- Multi-venue management
- Inventory / recipe tracking

---

## 6. Technical stack

| Layer | Technology | Rationale |
|-------|-----------|-----------|
| **Frontend** | Next.js 14 (App Router) | SSR for fast first load on mobile; PWA support |
| **Styling** | Tailwind CSS | Rapid iteration; dark theme by default |
| **PWA / Offline** | next-pwa + Workbox | Service Worker caching for menu data |
| **Backend / DB** | Supabase (PostgreSQL) | Auth, DB, Realtime subscriptions, Storage |
| **Realtime orders** | Supabase Realtime | Staff panel updates without polling |
| **Payments** | @mercadopago/sdk-react with Wallet Brick | Apple Pay + Google Pay + card in CLP. Uses Bricks (Checkout Pro v2), not raw Checkout API. |
| **QR scanning** | html5-qrcode (browser) | No native app needed for staff scanner |
| **Hosting** | Vercel | Zero-config Next.js deploy, global CDN |
| **Image storage** | Supabase Storage | Product images with CDN URLs |
| **Language** | TypeScript | Full stack type safety |

---

## 7. Core data model

All tables use UUID primary keys, `created_at` (TIMESTAMPTZ DEFAULT now()), and `updated_at` (TIMESTAMPTZ DEFAULT now()) unless noted otherwise.

### venues

```sql
id              UUID PRIMARY KEY DEFAULT gen_random_uuid()
name            TEXT NOT NULL
slug            TEXT UNIQUE NOT NULL          -- URL-friendly identifier
logo_url        TEXT
contact_email   TEXT NOT NULL
mp_access_token TEXT NOT NULL                 -- venue's Mercado Pago OAuth token
commission_pct  NUMERIC(5,2) DEFAULT 2.50     -- Trago commission %
active          BOOLEAN DEFAULT true
created_at      TIMESTAMPTZ DEFAULT now()
updated_at      TIMESTAMPTZ DEFAULT now()
```

### categories

```sql
id              UUID PRIMARY KEY DEFAULT gen_random_uuid()
venue_id        UUID REFERENCES venues(id) ON DELETE CASCADE
name            TEXT NOT NULL
display_order   INTEGER NOT NULL DEFAULT 0
active          BOOLEAN DEFAULT true
created_at      TIMESTAMPTZ DEFAULT now()
updated_at      TIMESTAMPTZ DEFAULT now()
```

### products

```sql
id              UUID PRIMARY KEY DEFAULT gen_random_uuid()
category_id     UUID REFERENCES categories(id) ON DELETE CASCADE
venue_id        UUID REFERENCES venues(id) ON DELETE CASCADE
name            TEXT NOT NULL
description     TEXT
price_clp       INTEGER NOT NULL               -- price in CLP (integer, no decimals)
image_url       TEXT
available       BOOLEAN DEFAULT true            -- staff can toggle 86'd items
stock_count     INTEGER                         -- nullable = unlimited stock
display_order   INTEGER NOT NULL DEFAULT 0
created_at      TIMESTAMPTZ DEFAULT now()
updated_at      TIMESTAMPTZ DEFAULT now()
```

### orders

```sql
id              UUID PRIMARY KEY DEFAULT gen_random_uuid()
venue_id        UUID REFERENCES venues(id) ON DELETE CASCADE
session_id      UUID NOT NULL                   -- browser session (from sessionStorage)
order_number    SERIAL                          -- human-readable sequential number per venue
status          TEXT NOT NULL DEFAULT 'pending'
                CHECK (status IN ('pending','paid','preparing','ready','delivered','cancelled'))
total_clp       INTEGER NOT NULL
mp_payment_id   TEXT                            -- Mercado Pago payment ID
mp_status       TEXT                            -- MP payment status for debugging
notes           TEXT                            -- customer order-level notes
created_at      TIMESTAMPTZ DEFAULT now()
updated_at      TIMESTAMPTZ DEFAULT now()
```

### order_items

```sql
id              UUID PRIMARY KEY DEFAULT gen_random_uuid()
order_id        UUID REFERENCES orders(id) ON DELETE CASCADE
product_id      UUID REFERENCES products(id)
product_name    TEXT NOT NULL                   -- denormalized: snapshot at order time
quantity        INTEGER NOT NULL DEFAULT 1
unit_price_clp  INTEGER NOT NULL                -- snapshot at order time
notes           TEXT                            -- item-level customization
```

### staff_users

```sql
id              UUID PRIMARY KEY DEFAULT gen_random_uuid()
venue_id        UUID REFERENCES venues(id) ON DELETE CASCADE
name            TEXT NOT NULL
pin_hash        TEXT NOT NULL                   -- bcrypt hash of 4-digit PIN
role            TEXT NOT NULL CHECK (role IN ('scanner','admin'))
active          BOOLEAN DEFAULT true
created_at      TIMESTAMPTZ DEFAULT now()
```

### 7.1 Row Level Security (RLS) policies

Enable RLS on all tables. Define policies per role:

| Table | Role | Operation | Rule |
|-------|------|-----------|------|
| venues | anon | SELECT | WHERE active = true (slug + name only) |
| categories | anon | SELECT | WHERE venue.active = true AND category.active = true |
| products | anon | SELECT | WHERE venue.active = true AND product.available = true |
| orders | anon | INSERT | Any (session_id is set by client) |
| orders | anon | SELECT | WHERE session_id = request header x-session-id |
| orders | service_role | UPDATE | Webhooks only (status, mp_payment_id, mp_status) |
| orders | staff (JWT) | SELECT, UPDATE | WHERE venue_id = staff.venue_id |
| products | admin (JWT) | ALL | WHERE venue_id = admin.venue_id |
| categories | admin (JWT) | ALL | WHERE venue_id = admin.venue_id |

---

## 8. Payment integration (Mercado Pago)

Use **@mercadopago/sdk-react** with **Wallet Brick** (part of Checkout Bricks / Checkout Pro v2). This keeps the user inside the PWA while supporting Apple Pay, Google Pay, card, and WebPay.

### 8.1 Payment flow

1. Frontend builds order and calls POST /api/orders (Next.js API route).
2. Server validates cart, creates order in Supabase (status: 'pending'), then creates MP preference via MP SDK with the venue's mp_access_token.
3. Server returns preference_id to frontend.
4. Frontend renders Wallet Brick with preference_id. Customer completes payment.
5. MP sends webhook to POST /api/webhooks/mp.
6. Webhook validates signature (x-signature header + MP_WEBHOOK_SECRET), updates order status to 'paid', broadcasts via Supabase Realtime.
7. Frontend polls order status (fallback) or listens to Realtime channel. On 'paid', redirects to confirmation screen.

### 8.2 Commission model

> **Marketplace split payments**
>
> Each venue authenticates via their own Mercado Pago account (mp_access_token obtained via OAuth).
>
> Trago charges commission by creating MP marketplace split payments:
> - Venue receives: sale amount – Trago commission (commission_pct from venues table, default 2.5%)
> - Trago receives: commission directly via MP split at transaction time
>
> **PREREQUISITE:** Trago must register as an MP Marketplace application.
> For the MVP pilot, if Marketplace approval is not yet granted, skip the split and charge commission manually post-settlement. Document this as tech debt.

---

## 9. Service Worker strategy

Configure Workbox via next-pwa with the following strategies:

| Resource | Strategy | Rationale |
|----------|----------|-----------|
| Static assets (JS, CSS, fonts) | CacheFirst | Immutable after deploy; fast loads on slow wifi |
| Product images | CacheFirst (TTL 24h) | Images rarely change mid-event; saves bandwidth |
| Menu data (categories + products) | StaleWhileRevalidate | Show cached menu instantly, update in background. Customer always sees something. |
| API routes (/api/*) | NetworkOnly | Orders and payments must hit the server; never serve stale. |
| Order status polling | NetworkFirst (timeout 3s) | Try network; fallback to last known status on timeout. |

**Offline payment retry:** If the network drops after checkout but before MP confirmation, the frontend should queue the order and display a "Waiting for connection" screen. On reconnect, retry the status check automatically. Never assume payment failed just because the webhook hasn't arrived yet.

---

## 10. Error handling and edge cases

Claude Code must implement explicit handling for these scenarios. Do not leave them as TODO comments.

| Scenario | Expected behavior | Implementation |
|----------|-------------------|----------------|
| **Payment fails (MP returns rejected)** | Show clear error message. Let customer retry. Do NOT create a new order — reuse existing pending order. | Frontend catches MP Brick error callback. Show retry button. |
| **Webhook arrives before frontend polls** | No problem — order status already updated in DB. Frontend catches up on next poll or Realtime event. | Supabase Realtime subscription + polling as fallback. |
| **Product marked unavailable while in cart** | On checkout, server re-validates cart against current product availability. If any item is 86'd, return 409 with affected items. Frontend shows which items were removed. | POST /api/orders validates each product_id.available before creating order. |
| **Price changed between cart and checkout** | Server uses current DB prices, not frontend prices. If total differs, return 409 with new prices. Frontend asks customer to confirm. | Never trust frontend prices. Always recalculate server-side. |
| **Network lost mid-checkout** | Show "Waiting for connection" UI. Auto-retry on reconnect. Do not show "Payment failed". | navigator.onLine listener + exponential backoff retry. |
| **Duplicate webhook from MP** | Idempotent: if order already paid, ignore. Return 200 to MP. | Check order.status before updating. Use mp_payment_id as idempotency key. |
| **Staff scans invalid/expired QR** | Show "Order not found" or "Already delivered" message. | QR contains order UUID. Staff app fetches order and validates status. |

---

## 11. Project structure (for Claude Code)

Monorepo structure. Single Next.js app with two distinct route groups:

```
src/
  app/
    [venue]/                         ← Public customer-facing menu (PWA)
      page.tsx                       ← Menu home
      cart/page.tsx
      checkout/page.tsx
      order/[id]/page.tsx            ← Confirmation screen with QR
    dashboard/                       ← Venue admin (requires Supabase Auth)
      menu/page.tsx
      orders/page.tsx
    staff/                           ← Scanner app (PIN auth)
      scan/page.tsx
    api/
      orders/route.ts                ← Create order + MP preference
      orders/[id]/status/route.ts    ← Polling endpoint
      webhooks/mp/route.ts           ← MP payment webhook
  components/
    menu/                            ← ProductCard, CategoryNav, Cart, CartProvider
    staff/                           ← QRScanner, OrderCard
    dashboard/                       ← ProductForm, OrdersTable
    ui/                              ← Shared: Button, Modal, Toast, LoadingSpinner
  lib/
    supabase/
      client.ts                      ← Browser client
      server.ts                      ← Server client (service role for webhooks)
      types.ts                       ← Generated with supabase gen types
    mercadopago.ts                   ← MP SDK initialization + helpers
    errors.ts                        ← Custom error classes (CartValidationError, etc.)
    constants.ts                     ← Order statuses, SW strategies, etc.
  hooks/
    useCart.ts
    useOrderStatus.ts                ← Realtime + polling hybrid
    useOnlineStatus.ts
supabase/
  migrations/
    001_initial_schema.sql
    002_rls_policies.sql
    003_seed_data.sql
```

---

## 12. Environment variables

| Variable | Purpose |
|----------|---------|
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase project URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Supabase public anon key (client-side) |
| `SUPABASE_SERVICE_ROLE_KEY` | Server-side Supabase admin (webhooks, order updates) |
| `MP_ACCESS_TOKEN` | Mercado Pago platform app token (for Marketplace API) |
| `MP_WEBHOOK_SECRET` | Signature validation for MP webhooks |
| `NEXT_PUBLIC_BASE_URL` | App base URL (for QR code generation) |

---

## 13. Seed data script

Generate a migration file (`003_seed_data.sql`) with the following test data for local development and staging:

- **1 venue:** "Club Demo" with slug "club-demo", active = true, commission_pct = 2.50, a test mp_access_token placeholder.
- **3 categories:** "Cervezas" (order 1), "Tragos" (order 2), "Sin Alcohol" (order 3).
- **10 products** distributed across categories with realistic Chilean nightclub prices in CLP:
  - Cervezas: Heineken ($4.500), Corona ($4.000), Kunstmann ($5.000)
  - Tragos: Pisco Sour ($5.500), Gin Tonic ($6.500), Aperol Spritz ($7.000), Mojito ($6.000)
  - Sin Alcohol: Agua mineral ($2.000), Coca-Cola ($2.500), Red Bull ($4.000)
- **1 admin staff user:** name "Admin Demo", PIN 1234 (hashed), role admin.
- **1 scanner staff user:** name "Barra 1", PIN 0000 (hashed), role scanner.

---

## 14. Claude Code prompts (build order)

Feed these prompts to Claude Code in sequence. Each builds on the previous. Prompts are intentionally atomic — one concern per prompt.

### Phase 1 — Project scaffold

> **Prompt 1.1 — Init project**
>
> Create a Next.js 14 TypeScript project with Tailwind CSS, dark mode by default.
> Configure Supabase client (server + browser) in src/lib/supabase/.
> Add PWA support with next-pwa.
> Set up the folder structure from section 11 of the spec.
> Create .env.local.example with all variables from section 12.

> **Prompt 1.2 — Database schema**
>
> Create Supabase migration files from the data model in section 7:
> - 001_initial_schema.sql — all tables with types exactly as specified.
> - 002_rls_policies.sql — RLS policies from section 7.1.
> - 003_seed_data.sql — seed data from section 13.
>
> Generate TypeScript types with supabase gen types.

### Phase 2 — Public menu (customer PWA)

> **Prompt 2.1 — Menu UI**
>
> Build the customer-facing menu at /[venue]/page.tsx.
> Fetch categories and products from Supabase by venue slug.
> Render a mobile-first dark UI with category tabs and product cards (name, price CLP formatted, image, add-to-cart button).
> Large tap targets (min 48px), single-thumb optimized. Follow nightclub UX: dark bg, high contrast, big type.

> **Prompt 2.2 — Cart + offline**
>
> Implement cart state with React context (CartProvider) + useCart hook.
> Show floating cart button with item count. Cart page at /[venue]/cart.
> Configure Workbox Service Worker strategies from section 9 of the spec.
> Cache-first for assets, stale-while-revalidate for menu data, network-only for API routes.

### Phase 3 — Checkout + Mercado Pago

> **Prompt 3.1 — Order API route**
>
> Build POST /api/orders: validate cart server-side (check product availability, recalculate prices from DB).
> If any product is unavailable or price changed, return 409 with details.
> On success: create order in Supabase with status 'pending', create MP preference with venue's mp_access_token, return preference_id.

> **Prompt 3.2 — Payment UI**
>
> Build /[venue]/checkout. On submit, call POST /api/orders.
> Render @mercadopago/sdk-react Wallet Brick with the returned preference_id.
> Handle error callbacks from the Brick (show retry, don't create new order).
> Implement useOnlineStatus hook: if network drops, show 'Waiting for connection' UI.

> **Prompt 3.3 — Webhook + confirmation**
>
> Build POST /api/webhooks/mp: validate x-signature header, update order to 'paid' idempotently (ignore if already paid).
> Broadcast status change via Supabase Realtime.
> Build useOrderStatus hook: hybrid Realtime subscription + polling fallback (every 3s).
> Build /[venue]/order/[id] confirmation page: show order number and QR code (qrcode.react).

### Phase 4 — Staff scanner app

> **Prompt 4.1 — Scanner**
>
> Build /staff/scan with PIN login (venue_id + 4-digit PIN, no email).
> Use html5-qrcode to scan customer order QR codes via device camera.
> On scan: fetch order details, show items, confirm delivery button.
> Handle edge cases: order not found, already delivered, wrong venue.
> Subscribe to Supabase Realtime for new paid orders. Play sound alert on new order.

### Phase 5 — Venue admin dashboard

> **Prompt 5.1 — Admin dashboard**
>
> Build /dashboard with Supabase Auth (email + password).
> Menu management: list, create, edit, delete products and categories. Image upload to Supabase Storage.
> Live orders view: table showing today's orders with status and total. Auto-updates via Realtime.
> Basic stats: today's revenue (CLP formatted), order count, top 3 products.
> QR code generator: input venue slug, output printable QR linking to /[venue].

---

## 15. Open questions before pilot

> **Resolve before writing code**
>
> 1. Does the pilot venue accept Mercado Pago? (required to test payments end-to-end)
> 2. Will venue share wifi password or set up a dedicated guest network for the bar area?
> 3. What device will staff use for the scanner? (affects camera API testing)
> 4. Is the commission model (2.5%) acceptable to the venue, or do they prefer a flat monthly fee?
> 5. Do they need a printed QR stand design? (not a technical question, but blocks launch day)
> 6. Is Trago already registered as an MP Marketplace? If not, start the process now — approval can take weeks.

---

*Trago — Confidential — March 2026*
