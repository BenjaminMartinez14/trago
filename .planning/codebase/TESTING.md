# Testing Patterns

**Analysis Date:** 2026-04-11

## Test Framework

**Runner:**
- Not configured — no test framework is installed or configured in this codebase
- No `jest.config.*`, `vitest.config.*`, or any `*.test.*` / `*.spec.*` files exist
- No test-related packages in `package.json` (`devDependencies` contains only TypeScript, Tailwind, and `@types/*`)

**Run Commands:**
```bash
# No test commands available
npm run lint   # Only code quality check available
```

## Test File Organization

**Location:**
- Not applicable — no tests exist

**Naming:**
- Not applicable

## Test Structure

No tests are present. The project has no unit tests, integration tests, or E2E tests.

## Mocking

**Framework:** None installed

**Available Patterns:** None established

## Fixtures and Factories

**Test Data:**
- No test fixtures exist
- A hardcoded seed venue ID `VENUE_ID = "a1b2c3d4-0000-0000-0000-000000000001"` is present in `src/app/dashboard/menu/page.tsx` — this is seed data for development, not a test fixture

## Coverage

**Requirements:** None enforced

**Current Coverage:** 0% — no tests exist

## Test Types

**Unit Tests:** Not present
**Integration Tests:** Not present
**E2E Tests:** Not present — Playwright is not installed

## Recommended Testing Approach

Based on the codebase structure, these are the highest-value areas to test first:

**Unit Tests (Vitest recommended):**
- `src/app/api/orders/route.ts` — `validateBody()` function has complex validation logic covering UUIDs, array items, and price bounds
- `src/lib/errors.ts` — custom error class construction and field access
- `src/lib/format.ts` — `formatCLP()` currency formatting
- `src/lib/staff-auth.ts` — `signStaffToken()` / `verifyStaffToken()` JWT round-trip
- `src/app/[venue]/checkout/page.tsx` — `normalizePhone()` function (pure, complex regex logic)
- `src/lib/constants.ts` — `STAFF_STATUS_TRANSITIONS` and `ORDER_STATUSES` shape validation

**Integration Tests (API routes via fetch mocking or Next.js test utils):**
- `POST /api/orders` — the most business-critical route; covers venue lookup, product availability, price staleness, order creation, MP preference creation, and rollback
- `POST /api/staff/login` — PIN authentication flow with bcrypt comparison
- `PATCH /api/staff/orders/[id]/transition` — state machine transition guards
- `POST /api/webhooks/mp` — MercadoPago webhook handling

**E2E Tests (Playwright recommended):**
- Customer happy path: menu browse → add item → checkout → phone entry → tip selection → payment
- Cart persistence across navigation (sessionStorage)
- Offline fallback behavior (order status page with no network)
- Staff login → order queue → accept → mark ready flow

## Patterns to Establish

**Test file co-location (recommended):**
```
src/
  lib/
    format.ts
    format.test.ts       ← co-locate unit tests
    staff-auth.ts
    staff-auth.test.ts
  app/
    api/
      orders/
        route.ts
        route.test.ts    ← integration tests next to routes
```

**Async API route test pattern (Vitest):**
```typescript
import { POST } from "@/app/api/orders/route";

describe("POST /api/orders", () => {
  it("returns 400 when body is missing items", async () => {
    const req = new Request("http://localhost/api/orders", {
      method: "POST",
      body: JSON.stringify({ venueSlug: "test", sessionId: crypto.randomUUID(), items: [] }),
    });
    const res = await POST(req);
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error).toBe("BAD_REQUEST");
  });
});
```

**Pure function test pattern:**
```typescript
import { formatCLP } from "@/lib/format";

describe("formatCLP", () => {
  it("formats CLP currency with no decimals", () => {
    expect(formatCLP(1000)).toBe("$1.000");
  });
});
```

---

*Testing analysis: 2026-04-11*
