# Architecture

**Analysis Date:** 2026-04-11

## Pattern Overview

**Overall:** Multi-tenant venue platform using Next.js App Router with a hybrid server/client rendering model, backed by Supabase (PostgreSQL + Realtime).

**Key Characteristics:**
- Server Components fetch data directly from Supabase using a service-role client (no REST layer for reads)
- Client Components own interactive state (cart, order status, staff UI) and communicate with API routes
- Three distinct user contexts with separate authentication systems: customers (anonymous), staff (JWT via PIN login), and venue admins (Supabase Auth)
- Multi-tenant by venue slug: all public routes are scoped under `[venue]` dynamic segment
- Stations sub-divide a venue's menu and order queue (customer selects station via `?s=` query param)

## Layers

**Data Access (Supabase Clients):**
- Purpose: Two client factories for server-side Supabase access
- Location: `src/lib/supabase/server.ts`
- `createClient()`: uses anon key + cookies, for dashboard auth checks (Supabase Auth session)
- `createServiceClient()`: uses service-role key, bypasses RLS, used by all API routes and Server Component data fetches. Passes `cache: 'no-store'` on every fetch to prevent Next.js caching.
- `createClient()` (browser): `src/lib/supabase/client.ts` — used only by `useOrderStatus` hook for Realtime subscriptions

**Type Layer:**
- Purpose: Hand-authored TypeScript interfaces mirroring the database schema
- Location: `src/lib/supabase/types.ts`
- Contains row types, insert types, the `Database` type for Supabase generics, and `OrderStatus` union
- Note: Types are hand-maintained, not generated. Must be updated when migrations change the schema.

**Server Components (Data Fetching):**
- Purpose: Render the initial HTML shell and pass data as props to Client Components
- Location: `src/app/[venue]/page.tsx` (menu), `src/app/[venue]/not-found.tsx`
- Pattern: Fetch from Supabase directly (no intermediate service layer), call `notFound()` or `redirect()` from `next/navigation` for control flow

**API Routes:**
- Purpose: Mutations and operations requiring server-side business logic
- Location: `src/app/api/`
- Three API namespaces:
  - `api/orders/` — public customer order creation, status polling, payment test helper
  - `api/staff/` — staff-authenticated order management (JWT Bearer token)
  - `api/dashboard/` — admin CRUD for menu, stations, staff, QR codes (Supabase Auth session)
  - `api/webhooks/mp/` — inbound Mercado Pago payment webhook
- All routes use `createServiceClient()` for DB writes. Dashboard routes additionally call `createClient()` to verify the admin session before proceeding.

**Client Components:**
- Purpose: Interactive UI, local state, and browser API usage
- Location: `src/components/menu/`, `src/app/[venue]/checkout/page.tsx`, `src/app/[venue]/order/[id]/page.tsx`, `src/app/staff/scan/`
- Cart state is managed by `src/components/menu/CartProvider.tsx` (React Context + sessionStorage persistence)
- Staff scan page (`src/app/staff/scan/page.tsx`) is a large stateful client component managing a finite-state machine (login → station_select → queue → order → transitioning)

**Custom Hooks:**
- Purpose: Reusable browser-side logic
- Location: `src/hooks/`
- `useOrderStatus`: Supabase Realtime subscription with polling fallback, stops on terminal status
- `useCart`: thin wrapper around `CartContext`
- `useOnlineStatus`: window online/offline event listener

**Utilities / Lib:**
- Location: `src/lib/`
- `mercadopago.ts` — wraps the MP SDK's `Preference.create()`, returns a preference ID
- `kapso.ts` — sends WhatsApp "order ready" notification via Kapso AI API; failures are fire-and-forget (never throws)
- `staff-auth.ts` — signs and verifies HS256 JWT tokens for staff sessions; extracts Bearer token from `Authorization` header
- `errors.ts` — domain error classes: `CartValidationError`, `PaymentError`, `OrderNotFoundError`
- `constants.ts` — `OrderStatus`, `POLL_INTERVAL_MS`, session storage keys, `STAFF_STATUS_TRANSITIONS`
- `format.ts` — `formatCLP()` currency formatter

**Middleware:**
- Location: `src/middleware.ts`
- Scope: `/dashboard/:path*` only
- Checks Supabase Auth session; redirects unauthenticated requests to `/dashboard/login`
- Passes current `pathname` to all responses as `x-pathname` header (consumed by `DashboardLayout`)

## Data Flow

**Customer Order Creation:**
1. Server Component (`src/app/[venue]/page.tsx`) fetches venue + categories + products from Supabase and renders `MenuClient`
2. Customer builds cart in `CartProvider` (persisted to `sessionStorage`)
3. On checkout (`src/app/[venue]/checkout/page.tsx`), a `POST /api/orders` is submitted with cart items, sessionId, stationId, customerPhone, and tipCLP
4. `src/app/api/orders/route.ts` validates input, re-fetches product prices from DB, detects price staleness and unavailability, inserts `orders` and `order_items` rows, then calls `createPreference()` to create a Mercado Pago payment preference
5. Client receives `orderId` + `preferenceId` and renders the MP Wallet brick
6. On payment approval, Mercado Pago calls `POST /api/webhooks/mp/route.ts`, which verifies the HMAC signature, maps MP status → order status, and updates the `orders` row
7. Customer's `useOrderStatus` hook receives the status update via Supabase Realtime (or polling fallback) and updates the UI

**Staff Order Fulfillment:**
1. Staff logs in at `/staff/scan` with a PIN via `POST /api/staff/login`, receives a JWT (12h expiry)
2. Staff selects a station; token + stationId are persisted to `localStorage`
3. `OrderQueue` component polls `GET /api/staff/orders` (filtered by stationId) to display paid/preparing orders
4. Staff taps an order to view details, then calls `PATCH /api/staff/orders/[id]/transition` with an action (`accept`, `mark_ready`, `deliver`)
5. Transition endpoint validates JWT, checks venue ownership, performs DB update with `status IN (fromStatuses)` as optimistic concurrency guard
6. On `mark_ready`, a WhatsApp notification is sent to the customer via Kapso (fire-and-forget)
7. Delivery is confirmed by scanning the customer's QR code (which encodes the order UUID)

**Dashboard Admin Flow:**
1. Admin authenticates via Supabase Auth at `/dashboard/login`
2. Middleware enforces session on all `/dashboard/*` routes; layout double-checks via `createClient().auth.getUser()`
3. Dashboard pages are client components that call `/api/dashboard/*` REST routes
4. Dashboard API routes verify admin session via `createClient()` before allowing mutations

## Key Abstractions

**Order Status State Machine:**
- Values: `pending → paid → preparing → ready → delivered` (or `cancelled` from `paid/preparing/ready`)
- Source of truth: `orders.status` column in Supabase
- Defined at: `src/lib/supabase/types.ts` (`OrderStatus`), `src/lib/constants.ts` (`ORDER_STATUS_LABELS`, `STAFF_STATUS_TRANSITIONS`)
- Allowed transitions enforced server-side in: `src/app/api/staff/orders/[id]/transition/route.ts`

**CartProvider:**
- Purpose: Client-side cart state available to all components inside `[venue]/layout.tsx`
- Location: `src/components/menu/CartProvider.tsx`
- Persists items to `sessionStorage`; sessionId (UUID), stationId, and customerPhone are separate keys

**Supabase Client Factories:**
- `createServiceClient()` — used for all mutations and any query needing to bypass RLS
- `createClient()` — anon key with cookies, for reading the authenticated admin session
- Browser `createClient()` — only for Realtime subscriptions in hooks

**Two Separate Auth Systems:**
- Admin: Supabase Auth (email/password). Session via cookies. Enforced by middleware + layout.
- Staff: Custom JWT (HS256, `STAFF_JWT_SECRET`). 12h expiry. Passed as `Authorization: Bearer <token>`. PIN-hashed with bcrypt (implicit in staff login route).

## Entry Points

**Customer Menu (`src/app/[venue]/page.tsx`):**
- Triggers: Customer scans QR code or visits `/{venue}?s={station}`
- Responsibilities: Resolve venue from slug, optionally filter by station, render `MenuClient` with fetched data

**Order API (`src/app/api/orders/route.ts`):**
- Triggers: `POST /api/orders` from checkout page
- Responsibilities: Validate, price-check, create order record + items, create MP preference, return IDs

**Webhook (`src/app/api/webhooks/mp/route.ts`):**
- Triggers: Mercado Pago payment event notification
- Responsibilities: Verify HMAC signature, fetch payment from MP, map status, update order in DB

**Staff Scan (`src/app/staff/scan/page.tsx`):**
- Triggers: Staff navigates to `/staff/scan`
- Responsibilities: Full staff order-management workflow as a finite-state machine page

**Dashboard (`src/app/dashboard/`):**
- Triggers: Admin navigates to `/dashboard`
- Responsibilities: CRUD UI for menu, stations, staff, QR codes, and revenue stats

## Error Handling

**Strategy:** Fail fast with structured error codes returned as JSON. No error boundary wrapping in pages; individual UI phases handle error states inline.

**Patterns:**
- API routes return `{ error: "ERROR_CODE", message?: string }` with appropriate HTTP status codes
- `ValidationError` (local class in orders route) distinguishes input errors (400) from server errors (500)
- Domain error classes in `src/lib/errors.ts` (`CartValidationError`, `PaymentError`, `OrderNotFoundError`) — currently defined but not consistently used across API routes
- On MP preference or order-items failure, the order is rolled back to `cancelled` status to prevent orphaned pending orders
- Kapso WhatsApp failures are explicitly fire-and-forget: `void sendOrderReadyWhatsApp().catch(...)`
- `useOrderStatus` hook silently ignores network errors and keeps polling

## Cross-Cutting Concerns

**Logging:** `console.error` and `console.warn` with prefixed tags (e.g., `[POST /api/orders]`, `[webhook/mp]`, `[transition]`). No structured logging library.
**Validation:** Manual inline validation in API routes with a local `ValidationError` class. No shared schema validation library (Zod not used).
**Authentication:** Two separate systems — Supabase Auth for admin dashboard, custom JWT for staff. No shared auth abstraction.
**Caching:** Service client passes `cache: 'no-store'` on all requests. Service worker (`public/sw.js`) handles client-side caching with strategies defined in `src/lib/constants.ts` (`SW_CACHE_STRATEGIES`).

---

*Architecture analysis: 2026-04-11*
