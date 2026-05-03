# Codebase Concerns

**Analysis Date:** 2026-04-11

## Tech Debt

**Pervasive `(supabase as any)` casts on mutating operations:**
- Issue: `@supabase/supabase-js` v2.99.3 with hand-authored types returns `never` from `.insert()`, `.update()`, and `.delete()`. The workaround is casting the client to `any` before every mutating call.
- Files: `src/app/api/orders/route.ts`, `src/app/api/webhooks/mp/route.ts`, `src/app/api/dashboard/products/route.ts`, `src/app/api/dashboard/products/[id]/route.ts`, `src/app/api/dashboard/categories/route.ts`, `src/app/api/dashboard/categories/[id]/route.ts`, `src/app/api/dashboard/stations/route.ts`, `src/app/api/dashboard/stations/[id]/route.ts`, `src/app/api/dashboard/stations/[id]/products/route.ts`, `src/app/api/dashboard/staff/route.ts`, `src/app/api/dashboard/staff/[id]/route.ts`, `src/app/api/dashboard/qr-codes/route.ts`, `src/app/api/dashboard/qr-codes/[id]/route.ts`, `src/app/api/orders/[id]/test-pay/route.ts`, `src/app/api/staff/orders/[id]/transition/route.ts`
- Impact: Zero type safety on all database writes; runtime errors from field name typos will not be caught at compile time.
- Fix approach: Run `supabase gen types typescript --project-id mdjyubpurjhgnunxgunt > src/lib/supabase/types.ts` to generate types compatible with the installed SDK version. This replaces all 15+ `as any` casts with properly typed calls. Noted in `src/lib/supabase/types.ts` line 1 comment.

**Hand-authored Supabase types are not generated:**
- Issue: `src/lib/supabase/types.ts` is manually maintained. It does not include all columns added in migrations 004–008 (`tip_clp`, `customer_phone`, `station_id` on orders). Missing columns require `(order as any).tip_clp` casts at 8+ use sites.
- Files: `src/lib/supabase/types.ts`, `src/app/api/dashboard/stats/route.ts` (lines 38, 56), `src/app/staff/scan/_components/order-view.tsx` (lines 174, 179, 185), `src/app/staff/scan/_components/order-queue.tsx` (lines 245, 247, 249), `src/app/dashboard/orders/page.tsx` (lines 90, 147)
- Impact: Any future migration that adds a column will silently go untyped. Type drift accumulates with each schema change.
- Fix approach: Generate types via Supabase CLI. The comment on line 1 of `src/lib/supabase/types.ts` already instructs this.

**Hardcoded venue UUID in dashboard pages:**
- Issue: `const VENUE_ID = "a1b2c3d4-0000-0000-0000-000000000001"` is hardcoded in two client pages. This is the seed data venue ID.
- Files: `src/app/dashboard/menu/page.tsx` (line 9), `src/app/dashboard/stations/page.tsx` (line 8)
- Impact: Dashboard is non-functional for any venue other than the seed venue. Adding a second venue to the platform breaks the entire dashboard CRUD for that venue.
- Fix approach: Fetch the venue ID from the authenticated user's session or a `/api/dashboard/me` endpoint. The `getAuthenticatedVenueId()` helper already exists in `src/app/api/dashboard/staff/route.ts` — expose it via an API route or derive it server-side.

**MercadoPago `Wallet` component cast to `any`:**
- Issue: `const W = Wallet as any` in `src/app/[venue]/checkout/page.tsx` (lines 296–297). Noted as a known workaround in `HANDOFF.md`.
- Files: `src/app/[venue]/checkout/page.tsx`
- Impact: Loss of prop type checking on the payment component. Breaking API changes in `@mercadopago/sdk-react` will not surface until runtime.
- Fix approach: Monitor `@mercadopago/sdk-react` for updated type definitions or submit a type override in `src/types/mercadopago.d.ts`.

---

## Security Considerations

**No rate limiting on any API endpoint:**
- Risk: The staff login endpoint at `src/app/api/staff/login/route.ts` accepts unlimited PIN guesses. A 4-digit PIN space is only 10,000 combinations — brute-forceable in seconds with no lockout.
- Files: `src/app/api/staff/login/route.ts`, `src/app/api/orders/route.ts`
- Current mitigation: bcrypt compare is slow (~100ms), providing minimal friction.
- Recommendations: Add per-IP rate limiting using Vercel Edge middleware or an upstash/redis-based solution. Lock out after 5 failed attempts per `venueSlug` + source IP combination.

**MP webhook signature validation is opt-in based on env var presence:**
- Risk: If `MP_WEBHOOK_SECRET` is not set in production, the signature check is skipped entirely (line 63 of `src/app/api/webhooks/mp/route.ts`: `if (secret && ...`). An attacker can forge payment confirmations.
- Files: `src/app/api/webhooks/mp/route.ts` (line 63)
- Current mitigation: Secret is confirmed set in production per `HANDOFF.md`. However, the code path permitting unsigned webhooks exists.
- Recommendations: Change the guard to `if (!secret) { return 401; }` — fail closed when the secret is missing, rather than fail open.

**`orders_anon_select` RLS policy is open (`USING (true)`):**
- Risk: Any anonymous user can read any order record if they know the order UUID. Migration 006 intentionally changed this from a session-id header check to `USING (true)` to enable Supabase Realtime, treating UUID as a capability token.
- Files: `supabase/migrations/006_realtime_and_station_orders.sql`
- Current mitigation: Order UUIDs are v4 random (128-bit), making enumeration impractical.
- Recommendations: This is an accepted design trade-off. Document it explicitly so future maintainers don't accidentally tighten or loosen it. Consider adding a `USING (status != 'cancelled' OR ...)` guard to limit sensitive order data exposure.

**Dashboard PATCH endpoint accepts arbitrary field updates without input validation:**
- Risk: `src/app/api/dashboard/products/[id]/route.ts` PATCH handler passes the raw request body directly to `.update(body)` with no field allowlist. An authenticated dashboard user could update any column, including `venue_id`.
- Files: `src/app/api/dashboard/products/[id]/route.ts` (lines 31–36)
- Current mitigation: Endpoint requires Supabase Auth session (admin role).
- Recommendations: Explicitly allowlist writable fields: `name`, `description`, `price_clp`, `image_url`, `available`, `display_order`, `category_id`. Reject unknown fields.

**`test-pay` endpoint relies on a client-controlled env var for feature gating:**
- Risk: The test payment endpoint checks `NEXT_PUBLIC_MP_PUBLIC_KEY?.startsWith("TEST-")`. `NEXT_PUBLIC_` variables are embedded in the client bundle. If a production key were accidentally prefixed with `TEST-`, the bypass endpoint would be unlocked in production.
- Files: `src/app/api/orders/[id]/test-pay/route.ts` (line 9)
- Current mitigation: The env var is confirmed to be a live key in production.
- Recommendations: Add a separate server-only `ENABLE_TEST_PAY=true` env var for the feature gate instead of inferring it from the MP key prefix.

**No validation of `image_url` field — accepts arbitrary URLs:**
- Risk: `src/app/api/dashboard/products/route.ts` and `[id]/route.ts` accept any string as `image_url`. Images are rendered directly via `<img src={p.image_url}>` in the dashboard and customer-facing menu.
- Files: `src/app/api/dashboard/products/route.ts`, `src/app/dashboard/menu/page.tsx`
- Current mitigation: Dashboard access is gated by Supabase Auth.
- Recommendations: Validate `image_url` is a Supabase Storage public URL (`supabase.co/storage`) before accepting it.

---

## Performance Bottlenecks

**Stats endpoint fetches all orders for today with no venue filter:**
- Problem: `src/app/api/dashboard/stats/route.ts` fetches all orders for today's date via `service.from("orders").select("*").gte("created_at", todayStart)`. At high order volume this returns a large payload to compute aggregates in JavaScript.
- Files: `src/app/api/dashboard/stats/route.ts`
- Cause: Aggregation done in Node.js rather than pushed to the database.
- Improvement path: Use Supabase RPC (PostgreSQL functions) for aggregations. Also, add a `venue_id` filter — the current query returns all venues' orders (mitigated by service role, but wasteful).

**Dual polling + Realtime subscription in customer order status hook:**
- Problem: `src/hooks/useOrderStatus.ts` runs both a 3-second polling interval and a Realtime subscription simultaneously. If Realtime works, polling is redundant traffic. If Realtime is blocked by RLS, polling is the fallback.
- Files: `src/hooks/useOrderStatus.ts`
- Cause: Defensive implementation from an earlier bug where Realtime was unreliable.
- Improvement path: Add Realtime connection state detection and disable polling when a confirmed subscription is active.

**Staff order queue uses both polling and Realtime:**
- Problem: Same dual-strategy pattern in `src/app/staff/scan/_components/order-queue.tsx` (polling every 3s + Realtime).
- Files: `src/app/staff/scan/_components/order-queue.tsx`
- Cause: Same root cause as `useOrderStatus`.
- Improvement path: Consolidate into a single Realtime subscription with a one-time initial fetch.

**No pagination on dashboard data fetches:**
- Problem: All dashboard list endpoints (`/api/dashboard/products`, `/api/dashboard/categories`, `/api/dashboard/staff`) fetch all rows with no pagination. The `stats` endpoint fetches all of today's `order_items` for top-products calculation (N+1 potential at scale).
- Files: `src/app/api/dashboard/products/route.ts`, `src/app/api/dashboard/categories/route.ts`, `src/app/api/dashboard/staff/route.ts`, `src/app/api/dashboard/stats/route.ts`
- Improvement path: Add `limit`/`offset` or cursor-based pagination for product and staff lists. Push the top-products aggregation to a DB function.

---

## Fragile Areas

**Order rollback is fire-and-forget with no error handling:**
- Files: `src/app/api/orders/route.ts` (lines 208, 236)
- Why fragile: When order item insert or MP preference creation fails, the code cancels the order with `await (supabase as any).from("orders").update(...)` but does not verify the rollback succeeded. A failed rollback leaves a `pending` order that can never be paid and will sit in the queue forever.
- Safe modification: Check the rollback update result and log a critical alert if it fails. Consider a cron job or background worker that cancels stale `pending` orders older than 10 minutes.
- Test coverage: No tests exist for this error path.

**`getAuthenticatedVenueId()` assumes exactly one venue per admin user:**
- Files: `src/app/api/dashboard/staff/route.ts` (line 13), `src/app/api/dashboard/staff/[id]/route.ts` (line 13)
- Why fragile: `service.from("venues").select("id").limit(1).single()` returns an arbitrary venue when a Supabase Auth user is linked to multiple venues. This silently operates on the wrong venue.
- Safe modification: Add a `venue_users` join table linking Supabase auth users to venues, or store the `venue_id` as a custom claim in the Supabase Auth JWT. The `limit(1).single()` pattern is a placeholder that works only while there is exactly one venue.
- Test coverage: None.

**Vercel stable alias must be manually updated after each deploy:**
- Files: `HANDOFF.md` (line 77)
- Why fragile: `trago-app.vercel.app` does not auto-update on new deployments. If the manual `vercel alias set` step is skipped, the production URL goes stale. MP webhook is registered to this URL — stale alias breaks all payment confirmations.
- Safe modification: Enable automatic production promotion in the Vercel dashboard (Settings → Git → Auto-assign Production Domain).

**`initMercadoPago()` called at module level:**
- Files: `src/app/[venue]/checkout/page.tsx` (line 13)
- Why fragile: `initMercadoPago(process.env.NEXT_PUBLIC_MP_PUBLIC_KEY ?? "")` runs at import time. If the env var is absent, the SDK is initialized with an empty string, causing cryptic payment errors rather than a clear startup failure.
- Safe modification: Add a guard that throws or logs a startup error if the key is missing/empty.

**WhatsApp notification has a typo in the template parameter name:**
- Files: `src/lib/kapso.ts` (line 36)
- Why fragile: The template parameter is named `"order_numer"` (missing `b`). If the Kapso/WhatsApp template was registered with the correct spelling `"order_number"`, all WhatsApp notifications silently fail or render incorrectly. Errors are swallowed by the fire-and-forget pattern.
- Safe modification: Verify the exact parameter name against the registered WhatsApp template and correct the typo.

---

## Missing Critical Features

**No tests anywhere in the project:**
- Problem: Zero test files exist outside `node_modules`. There are no unit, integration, or E2E tests.
- Blocks: Any refactoring (especially the `as any` migration), rate limiting additions, or schema changes cannot be validated safely.
- Priority: High — the order creation flow, webhook handler, and staff auth are untested critical paths.

**No input validation on dashboard product PATCH body:**
- Problem: `src/app/api/dashboard/products/[id]/route.ts` forwards the full request body to Supabase with no field allowlist or type coercion. See Security section above.
- Priority: High.

**No error feedback in dashboard CRUD on failed API calls:**
- Problem: Dashboard pages (`src/app/dashboard/menu/page.tsx`, `src/app/dashboard/staff/page.tsx`, `src/app/dashboard/stations/page.tsx`) call `fetch(...)` and call `onReload()` immediately after with no `await res.ok` check. Failed creates/updates silently reload the old data.
- Files: `src/app/dashboard/menu/page.tsx` (lines 126–128, 306–313), `src/app/dashboard/staff/page.tsx`
- Priority: Medium.

**No multi-venue support despite commission model in schema:**
- Problem: `venues.commission_pct` and `venues.mp_access_token` suggest multi-venue SaaS intent, but the hardcoded `VENUE_ID` in dashboard pages and the `limit(1)` venue lookup mean only one venue can be operated.
- Blocks: Onboarding any venue beyond the seed data venue.
- Priority: High for production scale.

---

## Test Coverage Gaps

**Order creation critical path:**
- What's not tested: Price staleness check, product availability check, MP preference creation, order item insert rollback, tip validation (negative/overflow).
- Files: `src/app/api/orders/route.ts`
- Risk: A regression in price validation or rollback logic could allow fraudulent orders or leave orphaned records.
- Priority: High.

**Webhook idempotency:**
- What's not tested: Duplicate webhook delivery, out-of-order status transitions, signature validation bypass (empty secret).
- Files: `src/app/api/webhooks/mp/route.ts`
- Risk: Duplicate `approved` webhooks could trigger double state transitions; missing signature check in test environment could mask the open-by-default bug.
- Priority: High.

**Staff auth flow:**
- What's not tested: JWT expiry handling, token tampering, PIN brute force (no lockout verification), venue isolation (staff from venue A accessing venue B orders).
- Files: `src/lib/staff-auth.ts`, `src/app/api/staff/login/route.ts`, `src/app/api/staff/orders/[id]/transition/route.ts`
- Priority: High.

**`getAuthenticatedVenueId()` multi-venue edge case:**
- What's not tested: Admin user linked to multiple venues returns wrong venue.
- Files: `src/app/api/dashboard/staff/route.ts`, `src/app/api/dashboard/staff/[id]/route.ts`
- Priority: Medium.

---

*Concerns audit: 2026-04-11*
