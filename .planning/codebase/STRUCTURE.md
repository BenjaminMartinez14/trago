# Codebase Structure

**Analysis Date:** 2026-04-11

## Directory Layout

```
trago/
├── public/                  # Static assets served directly
│   ├── manifest.json        # PWA manifest
│   ├── sw.js                # Service worker (Workbox, pre-built)
│   ├── workbox-3dea0b49.js  # Workbox runtime
│   └── icons/               # PWA icon set
├── src/
│   ├── app/                 # Next.js App Router — all routes and API handlers
│   │   ├── layout.tsx       # Root layout (fonts, global metadata, dark mode class)
│   │   ├── page.tsx         # Root page (redirect or landing)
│   │   ├── globals.css      # Global Tailwind + custom CSS
│   │   ├── [venue]/         # Customer-facing multi-tenant routes (scoped by venue slug)
│   │   │   ├── layout.tsx   # Wraps children with CartProvider
│   │   │   ├── page.tsx     # Menu / station picker page (Server Component)
│   │   │   ├── not-found.tsx
│   │   │   ├── cart/
│   │   │   │   └── page.tsx # Cart review page
│   │   │   ├── checkout/
│   │   │   │   └── page.tsx # Checkout + Mercado Pago Wallet brick (Client Component)
│   │   │   └── order/[id]/
│   │   │       └── page.tsx # Order status + QR code display (Client Component)
│   │   ├── api/             # API route handlers (Next.js Route Handlers)
│   │   │   ├── orders/
│   │   │   │   ├── route.ts             # POST /api/orders — create order
│   │   │   │   └── [id]/
│   │   │   │       ├── status/route.ts  # GET /api/orders/[id]/status
│   │   │   │       └── test-pay/route.ts # POST — dev-only payment simulation
│   │   │   ├── staff/
│   │   │   │   ├── login/route.ts       # POST /api/staff/login — PIN auth, returns JWT
│   │   │   │   ├── stations/route.ts    # GET /api/staff/stations
│   │   │   │   └── orders/
│   │   │   │       ├── route.ts         # GET /api/staff/orders — order queue
│   │   │   │       └── [id]/
│   │   │   │           ├── route.ts     # GET /api/staff/orders/[id]
│   │   │   │           └── transition/route.ts # PATCH — status transition
│   │   │   ├── dashboard/
│   │   │   │   ├── categories/
│   │   │   │   │   ├── route.ts         # GET, POST
│   │   │   │   │   └── [id]/route.ts    # PATCH, DELETE
│   │   │   │   ├── products/
│   │   │   │   │   ├── route.ts         # GET, POST
│   │   │   │   │   └── [id]/route.ts    # PATCH, DELETE
│   │   │   │   ├── stations/
│   │   │   │   │   ├── route.ts         # GET, POST
│   │   │   │   │   └── [id]/
│   │   │   │   │       ├── route.ts     # PATCH, DELETE
│   │   │   │   │       └── products/route.ts # Manage station-product assignments
│   │   │   │   ├── staff/
│   │   │   │   │   ├── route.ts         # GET, POST
│   │   │   │   │   └── [id]/route.ts    # PATCH, DELETE
│   │   │   │   ├── qr-codes/
│   │   │   │   │   ├── route.ts         # GET, POST
│   │   │   │   │   └── [id]/route.ts    # DELETE
│   │   │   │   └── stats/route.ts       # GET — today's KPIs
│   │   │   └── webhooks/
│   │   │       └── mp/route.ts          # POST — Mercado Pago payment webhook
│   │   ├── dashboard/       # Admin dashboard (Supabase Auth protected)
│   │   │   ├── layout.tsx   # Auth guard + sidebar nav layout
│   │   │   ├── DashboardNav.tsx
│   │   │   ├── page.tsx     # Stats overview
│   │   │   ├── login/page.tsx
│   │   │   ├── menu/page.tsx    # Category + product management
│   │   │   ├── orders/page.tsx  # Live order monitor
│   │   │   ├── staff/page.tsx   # Staff user management
│   │   │   └── stations/page.tsx # Station management
│   │   ├── staff/           # Staff-facing order fulfillment UI (JWT protected)
│   │   │   └── scan/
│   │   │       ├── page.tsx # Main staff scan page (state-machine Client Component)
│   │   │       └── _components/
│   │   │           ├── login-view.tsx
│   │   │           ├── order-queue.tsx
│   │   │           ├── order-view.tsx
│   │   │           └── scanner-view.tsx
│   │   └── offline/
│   │       └── page.tsx     # PWA offline fallback page
│   ├── components/          # Shared reusable components
│   │   ├── menu/            # Customer menu UI
│   │   │   ├── CartProvider.tsx  # React Context + sessionStorage cart state
│   │   │   ├── MenuClient.tsx    # Main menu client component
│   │   │   ├── CategoryNav.tsx   # Horizontal category filter tabs
│   │   │   ├── ProductCard.tsx   # Single product card with add-to-cart
│   │   │   └── CartItemRow.tsx   # Cart item row (used in cart page)
│   │   ├── ui/              # Generic UI primitives
│   │   │   ├── Button.tsx
│   │   │   └── LoadingSpinner.tsx
│   │   ├── dashboard/       # (directory exists, currently empty)
│   │   └── staff/           # (directory exists, currently empty)
│   ├── hooks/               # Custom React hooks
│   │   ├── useCart.ts       # Reads CartContext
│   │   ├── useOrderStatus.ts # Realtime + polling order status
│   │   └── useOnlineStatus.ts # window online/offline
│   ├── lib/                 # Server and shared utilities
│   │   ├── supabase/
│   │   │   ├── client.ts    # Browser Supabase client factory
│   │   │   ├── server.ts    # createClient() and createServiceClient()
│   │   │   └── types.ts     # Hand-authored DB type definitions
│   │   ├── constants.ts     # OrderStatus, labels, transitions, storage keys
│   │   ├── errors.ts        # Domain error classes
│   │   ├── format.ts        # formatCLP() currency formatter
│   │   ├── kapso.ts         # Kapso WhatsApp notification integration
│   │   ├── mercadopago.ts   # Mercado Pago preference creation
│   │   └── staff-auth.ts    # Staff JWT sign/verify/extract
│   └── middleware.ts        # Route middleware (dashboard auth guard)
├── supabase/
│   └── migrations/          # Ordered SQL migration files
│       ├── 001_initial_schema.sql
│       ├── 002_rls_policies.sql
│       ├── 003_seed_data.sql
│       ├── 004_qr_codes.sql
│       ├── 005_stations.sql
│       ├── 006_realtime_and_station_orders.sql
│       ├── 007_orders_replica_identity.sql
│       └── 008_customer_phone.sql
├── next.config.mjs
├── tailwind.config.ts
├── tsconfig.json
└── package.json
```

## Directory Purposes

**`src/app/[venue]/`:**
- Purpose: All customer-facing pages, scoped to a venue by slug
- Contains: Server Components for data fetching, Client Components for interaction
- Key files: `page.tsx` (menu + station picker), `checkout/page.tsx`, `order/[id]/page.tsx`

**`src/app/api/`:**
- Purpose: All Next.js Route Handlers (REST endpoints)
- Sub-namespaces: `orders/` (public), `staff/` (JWT auth), `dashboard/` (Supabase Auth), `webhooks/` (external)
- Pattern: Each file exports named HTTP method handlers (`GET`, `POST`, `PATCH`, `DELETE`)

**`src/app/dashboard/`:**
- Purpose: Admin management interface for venue operators
- Contains: Client Components that call dashboard API routes
- Auth: Protected by middleware + layout double-check

**`src/app/staff/scan/`:**
- Purpose: Staff order fulfillment UI — PIN login, station select, order queue, order detail
- Pattern: Large single-page Client Component with finite state machine; private sub-components in `_components/`

**`src/components/menu/`:**
- Purpose: All components used in the customer menu experience
- Key file: `CartProvider.tsx` — must wrap any component that uses `useCart`

**`src/components/ui/`:**
- Purpose: Generic, reusable UI primitives (Button, LoadingSpinner)

**`src/lib/supabase/`:**
- Purpose: Supabase client factories and database type definitions
- Use `createServiceClient()` for API routes and Server Component fetches; `createClient()` only for session reads in dashboard

**`src/lib/`:**
- Purpose: Framework-agnostic server utilities and third-party integrations
- Files here are safe to import from both API routes and Server Components

**`src/hooks/`:**
- Purpose: Client-only React hooks (browser APIs, context access, subscriptions)
- Must only be imported in Client Components (files with `"use client"`)

**`supabase/migrations/`:**
- Purpose: Ordered SQL migration files applied via Supabase CLI
- Generated: No — hand-written
- Committed: Yes

## Key File Locations

**Entry Points:**
- `src/app/layout.tsx`: Root layout, fonts (Poppins, Righteous), dark mode
- `src/app/[venue]/page.tsx`: Customer menu page
- `src/app/[venue]/checkout/page.tsx`: Order creation and payment
- `src/app/[venue]/order/[id]/page.tsx`: Order tracking with QR code
- `src/app/staff/scan/page.tsx`: Staff fulfillment interface
- `src/app/dashboard/page.tsx`: Admin stats dashboard

**Configuration:**
- `src/middleware.ts`: Auth guard for `/dashboard/*`
- `next.config.mjs`: Next.js configuration
- `tailwind.config.ts`: Tailwind config (custom colors: `trago-black`, `trago-orange`, `trago-card`, `trago-border`, etc.)
- `src/app/globals.css`: Global styles + utility classes

**Core Logic:**
- `src/app/api/orders/route.ts`: Main order creation with price validation
- `src/app/api/staff/orders/[id]/transition/route.ts`: Order status machine transitions
- `src/app/api/webhooks/mp/route.ts`: Payment webhook handler
- `src/lib/supabase/server.ts`: Supabase client factories
- `src/lib/staff-auth.ts`: Staff JWT logic

**State / Types:**
- `src/lib/supabase/types.ts`: All DB row and insert types
- `src/lib/constants.ts`: Order status constants and transition config
- `src/components/menu/CartProvider.tsx`: Cart context and sessionStorage sync

**Database:**
- `supabase/migrations/001_initial_schema.sql` through `008_customer_phone.sql`

## Naming Conventions

**Files:**
- React components: PascalCase (`CartProvider.tsx`, `MenuClient.tsx`)
- Hooks: camelCase with `use` prefix (`useCart.ts`, `useOrderStatus.ts`)
- API routes: always named `route.ts` (Next.js convention)
- Lib utilities: camelCase (`staff-auth.ts`, `mercadopago.ts`)
- Next.js special files: lowercase (`page.tsx`, `layout.tsx`, `not-found.tsx`)
- Private co-located components: in `_components/` subdirectory with kebab-case filenames

**Directories:**
- Feature groupings: kebab-case (`qr-codes/`, `station_products` in DB)
- Dynamic segments: bracket notation (`[venue]`, `[id]`)

**Code:**
- Types/interfaces: PascalCase (`OrderStatus`, `CartItem`, `StaffJWTPayload`)
- Constants: SCREAMING_SNAKE_CASE (`POLL_INTERVAL_MS`, `SESSION_ID_KEY`)
- Functions: camelCase (`createServiceClient`, `verifyStaffToken`, `formatCLP`)
- Components: PascalCase function declarations (not `React.FC`)

## Where to Add New Code

**New customer-facing page:**
- Page: `src/app/[venue]/{feature}/page.tsx`
- Components: `src/components/menu/{ComponentName}.tsx` if reused, or inline in the page

**New API endpoint:**
- Public (customer): `src/app/api/{resource}/route.ts`
- Staff-authenticated: `src/app/api/staff/{resource}/route.ts` — use `verifyStaffToken` from `src/lib/staff-auth.ts`
- Admin-authenticated: `src/app/api/dashboard/{resource}/route.ts` — call `createClient().auth.getUser()` first

**New dashboard admin page:**
- Page: `src/app/dashboard/{feature}/page.tsx`
- Add nav link to: `src/app/dashboard/DashboardNav.tsx`

**New DB table:**
- Add SQL migration: `supabase/migrations/00N_{description}.sql`
- Add row/insert types to: `src/lib/supabase/types.ts`
- Add table entry to the `Database` type in `src/lib/supabase/types.ts`

**New external integration:**
- Add client/helper: `src/lib/{service-name}.ts`
- Store credentials as env vars; add to `src/.env.local.example`

**New shared hook:**
- Add to: `src/hooks/use{Name}.ts`
- Must only use browser APIs; safe to import from Client Components only

**New reusable UI primitive:**
- Add to: `src/components/ui/{ComponentName}.tsx`

**New staff scan sub-view:**
- Add to: `src/app/staff/scan/_components/{view-name}.tsx`

## Special Directories

**`.planning/`:**
- Purpose: Planning and codebase analysis documents
- Generated: No
- Committed: Yes

**`.vercel/`:**
- Purpose: Vercel deployment configuration (`project.json`)
- Generated: Yes (by Vercel CLI)
- Committed: Yes (project linkage only, no secrets)

**`public/`:**
- Purpose: Static files served at root; includes pre-compiled service worker
- `sw.js` and `workbox-3dea0b49.js` are pre-built Workbox files, not generated at build time

**`.next/`:**
- Purpose: Next.js build output
- Generated: Yes
- Committed: No

---

*Structure analysis: 2026-04-11*
