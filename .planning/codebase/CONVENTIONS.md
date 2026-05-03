# Coding Conventions

**Analysis Date:** 2026-04-11

## Naming Patterns

**Files:**
- React page components: `page.tsx` (Next.js App Router convention)
- React layout components: `layout.tsx`
- Shared UI components: PascalCase, e.g. `ProductCard.tsx`, `CartProvider.tsx`, `Button.tsx`
- Private page sub-components: `_components/` subdirectory with kebab-case filenames, e.g. `src/app/staff/scan/_components/order-queue.tsx`
- Custom hooks: camelCase prefixed with `use`, e.g. `useCart.ts`, `useOrderStatus.ts`
- Library/utility modules: camelCase, e.g. `format.ts`, `staff-auth.ts`, `mercadopago.ts`
- API routes: `route.ts` (Next.js App Router convention)

**Functions:**
- React component functions: PascalCase, e.g. `ProductCard`, `CartProvider`, `DashboardMenuPage`
- Hook functions: camelCase with `use` prefix, e.g. `useCartContext`, `useOrderStatus`
- Helper/utility functions: camelCase, e.g. `formatCLP`, `isValidUUID`, `validateBody`, `normalizePhone`
- Event handlers: camelCase prefixed with `handle`, e.g. `handleDelete`, `handlePhoneContinue`, `handleTipContinue`, `handleSubmit`

**Variables:**
- camelCase throughout, e.g. `venueSlug`, `orderItems`, `staffList`, `priceChanges`
- Boolean flags: descriptive names like `cancelled`, `isOnline`, `uploading`, `saving`

**Types:**
- Named interfaces for object shapes: `interface ProductCardProps`, `interface ButtonProps`, `interface StaffJWTPayload`
- Type aliases for unions and state machines: `type CheckoutState = | { phase: "phone" } | ...`, `type Variant = "primary" | "secondary" | "ghost"`
- Database row types exported from `src/lib/supabase/types.ts` use `Row` / `Insert` / `Update` suffix pattern internally
- `Pick<TypeName, "field1" | "field2">` used extensively for narrow DB selects, e.g. `type VenueRow = Pick<Venue, "id" | "slug" | ...>`
- `as const` used for tuple/enum-like arrays, e.g. `ORDER_STATUSES`, `TIP_PRESETS`

## Code Style

**Formatting:**
- No Prettier config file found — formatting is manually maintained
- Semicolons: yes (TypeScript files consistently use them)
- Quotes: double quotes for strings in JSX attributes and imports
- Trailing commas: used in multi-line object/array literals

**Linting:**
- No `.eslintrc` config file — relies on Next.js built-in ESLint
- `eslint-disable-next-line @typescript-eslint/no-explicit-any` comments used when bypassing `any` restrictions (primarily for Supabase client typing workarounds)
- `eslint-disable-next-line react-hooks/exhaustive-deps` used in `src/app/[venue]/checkout/page.tsx` when intentional

**TypeScript:**
- `strict: true` enabled in `tsconfig.json`
- `any` is avoided in application logic but used with explicit suppression comments for Supabase insert/select chains that predate generated types
- `unknown` used in error catch blocks and validated with `instanceof Error` narrowing
- No Zod — manual validation functions used instead (e.g. `validateBody` in `src/app/api/orders/route.ts`)
- Interfaces preferred for object shapes (props, DB rows); type aliases for unions and state machines

## Import Organization

**Order:**
1. Framework/React imports (`"use client"` directive, `react`, `next/*`)
2. Third-party packages (`lucide-react`, `@mercadopago/sdk-react`, etc.)
3. Internal aliases (`@/lib/*`, `@/components/*`, `@/hooks/*`)

**Path Aliases:**
- `@/*` maps to `./src/*` (configured in `tsconfig.json`)
- Used consistently — no relative `../` imports observed

## Error Handling

**API Routes:**
- Validate request body in a try/catch, return `NextResponse.json({ error: "BAD_REQUEST" }, { status: 400 })` on failure
- Error codes are SCREAMING_SNAKE_CASE string constants, e.g. `"UNAUTHORIZED"`, `"VENUE_NOT_FOUND"`, `"PRICE_CHANGED"`, `"SERVER_ERROR"`
- Supabase errors: check `error` field from destructured result, return appropriate HTTP status
- Manual rollback pattern used for partial failures: cancel the order record via update when a subsequent insert fails
- Unknown errors narrowed with: `const msg = err instanceof Error ? err.message : "Invalid request"`

**Custom Error Classes:**
- Defined in `src/lib/errors.ts`: `CartValidationError`, `PaymentError`, `OrderNotFoundError`
- All extend `Error`, set `this.name` in constructor, use `public readonly` for extra fields
- Local `ValidationError extends Error` also defined inline in `src/app/api/orders/route.ts`

**Client-side:**
- State machine pattern used in `src/app/[venue]/checkout/page.tsx` — `CheckoutState` discriminated union drives all UI phases including `{ phase: "error"; message: string }`
- Network errors caught in try/catch inside async handlers, `setState({ phase: "error", ... })` called
- Hooks like `useOrderStatus` silently swallow network errors during polling (by design — keep polling)

## Logging

**Server-side:**
- `console.error("[context] description:", error)` for DB errors, payment failures, webhook errors
- `console.warn("[context] message")` for non-fatal unexpected conditions
- `console.log("[context] message")` for informational server-side events (e.g. WhatsApp dispatch)
- Prefix format: `[module/route]` in brackets, e.g. `[POST /api/orders]`, `[transition]`, `[webhook/mp]`, `[kapso]`
- No structured logging library — raw `console.*` used

**Client-side:**
- No `console.log` in client components

## Comments

**Section Dividers:**
- Long horizontal rule comments used to divide logical sections within files:
  ```typescript
  // ── Section name ─────────────────────────────────────────────────────────────
  ```
- Numbered steps for multi-phase operations:
  ```typescript
  // ── 1. Fetch venue ────────────────────────────────────────────────────────────
  // ── 2. Fetch products ────────────────────────────────────────────────────────
  ```

**Inline:**
- Business logic justifications documented inline, e.g.:
  - `// Roll back: cancel the order so it can never be paid`
  - `// Generic 401 — don't reveal whether venue exists`
  - `// Polling fallback every 3s`
  - `// never trust frontend prices`

**JSDoc:**
- Not used — TypeScript types serve as documentation

## Function Design

**Size:**
- Route handler functions are long (50–240 lines) due to multi-step sequential DB operations in a single handler; no service layer extraction
- Component files break into multiple sub-components within the same file (e.g. `DashboardMenuPage`, `ProductsTab`, `CategoriesTab`, `ProductForm` all in `src/app/dashboard/menu/page.tsx`)

**Parameters:**
- Props interfaces defined for all React components
- API route handlers receive `(request: Request, { params })` following Next.js convention

**Return Values:**
- API routes always return `NextResponse.json(...)` with explicit HTTP status
- Hooks return typed plain objects, e.g. `{ status, orderNumber, loading }`
- Utility functions return primitives or null, e.g. `formatCLP(amount): string`, `verifyStaffToken(token): Promise<StaffJWTPayload | null>`

## Module Design

**Exports:**
- Default exports for React components (pages and providers)
- Named exports for utility functions, hooks, types, and constants
- No barrel files (`index.ts`) — imports reference specific file paths directly

**Constants:**
- All application-level constants live in `src/lib/constants.ts`
- `as const` used for arrays and objects that serve as readonly config

## Immutability

- React state updates always return new arrays/objects via spread or filter/map
- Example from `src/components/menu/CartProvider.tsx`:
  ```typescript
  return prev.map((i) =>
    i.product.id === product.id ? { ...i, quantity: i.quantity + 1 } : i
  );
  ```
- Form state updated immutably: `setForm((f) => ({ ...f, name: e.target.value }))`

## TypeScript Specific Patterns

**Discriminated Unions for State Machines:**
```typescript
type CheckoutState =
  | { phase: "phone" }
  | { phase: "tip" }
  | { phase: "creating" }
  | { phase: "ready"; orderId: string; preferenceId: string }
  | { phase: "unavailable"; items: UnavailableItem[] }
  | { phase: "price_changed"; changes: PriceChange[] }
  | { phase: "error"; message: string };
```

**`as const` Enums:**
```typescript
export const ORDER_STATUSES = ["pending", "paid", "preparing", "ready", "delivered", "cancelled"] as const;
export type OrderStatus = (typeof ORDER_STATUSES)[number];
```

**Pick for Narrow Selects:**
```typescript
type VenueRow = Pick<Venue, "id" | "slug" | "mp_access_token" | "active">;
```

---

*Convention analysis: 2026-04-11*
