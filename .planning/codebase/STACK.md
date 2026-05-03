# Technology Stack

**Analysis Date:** 2026-04-11

## Languages

**Primary:**
- TypeScript 5.x - All application code under `src/`

**Secondary:**
- SQL (PostgreSQL) - Database migrations in `supabase/migrations/`
- CSS - Global styles in `src/app/globals.css`

## Runtime

**Environment:**
- Node.js (no explicit version pinned; host machine runs v24; Next.js 14 requires ≥18)

**Package Manager:**
- npm
- Lockfile: `package-lock.json` present

## Frameworks

**Core:**
- Next.js 14.2.35 (App Router) - Full-stack React framework; handles routing, SSR, API routes
- React 18 - UI rendering

**Build/Dev:**
- PostCSS 8 - CSS processing (`postcss.config.mjs`)
- Tailwind CSS 3.4.1 - Utility-first styling (`tailwind.config.ts`)
- `@ducanh2912/next-pwa` 10.2.9 - Progressive Web App wrapper around Workbox (`next.config.mjs`)

**Testing:**
- Not detected (no jest/vitest config present)

## Key Dependencies

**Critical:**
- `@supabase/supabase-js` 2.99.3 - Supabase client for DB queries and Realtime subscriptions
- `@supabase/ssr` 0.9.0 - Supabase SSR helpers for cookie-based auth in Next.js middleware/server components
- `mercadopago` 2.12.0 - MercadoPago server-side SDK (Preference creation, Payment fetching)
- `@mercadopago/sdk-react` 1.0.7 - MercadoPago React checkout Brick component
- `jose` 6.2.2 - JWT signing/verification for custom staff authentication (`src/lib/staff-auth.ts`)
- `bcryptjs` 3.0.3 - Password hashing for staff PIN storage

**UI:**
- `lucide-react` 0.577.0 - Icon library
- `qrcode.react` 4.2.0 - QR code generation (order pickup QR codes)
- `html5-qrcode` 2.3.8 - QR code scanning (staff scanner view)

## Configuration

**Environment:**
- Configured via `.env.local` (not committed); `.env.local.example` documents all required keys
- Required variables:
  - `NEXT_PUBLIC_SUPABASE_URL` - Supabase project URL
  - `NEXT_PUBLIC_SUPABASE_ANON_KEY` - Supabase anon key (public)
  - `SUPABASE_SERVICE_ROLE_KEY` - Supabase service role key (server-only)
  - `NEXT_PUBLIC_MP_PUBLIC_KEY` - MercadoPago public key (TEST- or APP_USR-)
  - `MP_ACCESS_TOKEN` - MercadoPago platform app access token (server-only)
  - `MP_WEBHOOK_SECRET` - MercadoPago webhook HMAC secret (server-only)
  - `STAFF_JWT_SECRET` - 32-char secret for signing staff JWTs (server-only)
  - `NEXT_PUBLIC_BASE_URL` - Base URL for redirect/webhook URLs
  - `KAPSO_API_KEY` - Kapso WhatsApp API key (optional; skipped if absent)
  - `KAPSO_PHONE_NUMBER_ID` - Kapso WhatsApp phone number ID (optional)

**Build:**
- `next.config.mjs` - Next.js + PWA config with Workbox runtime caching rules
- `tailwind.config.ts` - Custom color palette (`trago.*`), fonts, animations
- `tsconfig.json` - Strict mode, path alias `@/*` → `./src/*`, bundler module resolution
- `postcss.config.mjs` - PostCSS configuration

## Platform Requirements

**Development:**
- Node.js ≥18 (Next.js 14 requirement)
- Supabase project (local or hosted)
- MercadoPago sandbox credentials

**Production:**
- Supabase hosted project (PostgreSQL + Realtime + Storage)
- MercadoPago live credentials with webhook endpoint configured at `/api/webhooks/mp`
- PWA served over HTTPS (service worker requirement)
- Deploy target not specified; compatible with Vercel (Next.js 14 App Router)

---

*Stack analysis: 2026-04-11*
