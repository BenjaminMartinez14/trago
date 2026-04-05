import { NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/server";
import { createPreference } from "@/lib/mercadopago";
import type { Venue, Product, Order } from "@/lib/supabase/types";

export const dynamic = "force-dynamic";

// ── Request shape ────────────────────────────────────────────────────────────

type OrderItem = {
  productId: string;
  quantity: number;
  unitPrice: number; // price customer saw — server detects staleness
  notes?: string;
};

type CreateOrderBody = {
  venueSlug: string;
  sessionId: string;
  stationId?: string;
  customerPhone?: string;
  items: OrderItem[];
  orderNotes?: string;
};

// ── Helpers ──────────────────────────────────────────────────────────────────

type VenueRow = Pick<Venue, "id" | "slug" | "mp_access_token" | "active">;
type ProductRow = Pick<Product, "id" | "name" | "price_clp" | "available" | "venue_id">;
type OrderRow = Pick<Order, "id" | "order_number">;

function isValidUUID(value: string): boolean {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(value);
}

class ValidationError extends Error {}

function validateBody(body: unknown): CreateOrderBody {
  if (!body || typeof body !== "object") throw new ValidationError("Invalid request body");
  const b = body as Record<string, unknown>;

  if (typeof b.venueSlug !== "string" || !b.venueSlug)
    throw new ValidationError("venueSlug is required");
  if (typeof b.sessionId !== "string" || !isValidUUID(b.sessionId))
    throw new ValidationError("sessionId must be a valid UUID");
  if (!Array.isArray(b.items) || b.items.length === 0)
    throw new ValidationError("items must be a non-empty array");

  for (const item of b.items as unknown[]) {
    if (!item || typeof item !== "object") throw new ValidationError("Invalid item");
    const i = item as Record<string, unknown>;
    if (typeof i.productId !== "string" || !isValidUUID(i.productId))
      throw new ValidationError("item.productId must be a valid UUID");
    if (typeof i.quantity !== "number" || i.quantity < 1 || !Number.isInteger(i.quantity))
      throw new ValidationError("item.quantity must be a positive integer");
    if (typeof i.unitPrice !== "number" || i.unitPrice < 0)
      throw new ValidationError("item.unitPrice must be a non-negative number");
  }

  return {
    venueSlug: b.venueSlug as string,
    sessionId: b.sessionId as string,
    stationId: typeof b.stationId === "string" && isValidUUID(b.stationId) ? b.stationId : undefined,
    customerPhone: typeof b.customerPhone === "string" ? b.customerPhone.trim().slice(0, 20) : undefined,
    items: b.items as OrderItem[],
    orderNotes: typeof b.orderNotes === "string" ? b.orderNotes : undefined,
  };
}

// ── Route handler ────────────────────────────────────────────────────────────

export async function POST(request: Request) {
  // ── Parse + validate body ─────────────────────────────────────────────────
  let body: CreateOrderBody;
  try {
    body = validateBody(await request.json());
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Invalid request";
    return NextResponse.json({ error: "BAD_REQUEST", message: msg }, { status: 400 });
  }

  const supabase = createServiceClient();

  // ── 1. Fetch venue (service role: needs mp_access_token) ──────────────────
  const { data: venueRaw, error: venueError } = await supabase
    .from("venues")
    .select("id, slug, mp_access_token, active")
    .eq("slug", body.venueSlug)
    .single();

  if (venueError || !venueRaw) {
    return NextResponse.json({ error: "VENUE_NOT_FOUND" }, { status: 404 });
  }

  const venue = venueRaw as VenueRow;

  if (!venue.active) {
    return NextResponse.json({ error: "VENUE_INACTIVE" }, { status: 404 });
  }

  // ── 2. Fetch current product state from DB ────────────────────────────────
  const productIds = body.items.map((i) => i.productId);

  const { data: dbProductsRaw, error: productsError } = await supabase
    .from("products")
    .select("id, name, price_clp, available, venue_id")
    .in("id", productIds);

  if (productsError) {
    console.error("[POST /api/orders] products fetch error:", productsError);
    return NextResponse.json({ error: "SERVER_ERROR" }, { status: 500 });
  }

  const dbProducts = (dbProductsRaw ?? []) as ProductRow[];
  const productMap = new Map<string, ProductRow>(dbProducts.map((p) => [p.id, p]));

  // ── 3. Validate all products exist and belong to this venue ───────────────
  const missingIds = productIds.filter((id) => !productMap.has(id));
  if (missingIds.length > 0) {
    return NextResponse.json({ error: "PRODUCT_NOT_FOUND", productIds: missingIds }, { status: 404 });
  }

  for (const [id, product] of Array.from(productMap.entries())) {
    if (product.venue_id !== venue.id) {
      return NextResponse.json({ error: "PRODUCT_NOT_FOUND", productIds: [id] }, { status: 404 });
    }
  }

  // ── 4. Check availability (86'd items) ────────────────────────────────────
  const unavailableItems = body.items
    .filter((item) => !productMap.get(item.productId)!.available)
    .map((item) => ({
      productId: item.productId,
      name: productMap.get(item.productId)!.name,
    }));

  if (unavailableItems.length > 0) {
    return NextResponse.json({ error: "UNAVAILABLE_ITEMS", unavailableItems }, { status: 409 });
  }

  // ── 5. Check for price changes ────────────────────────────────────────────
  const priceChanges = body.items
    .filter((item) => productMap.get(item.productId)!.price_clp !== item.unitPrice)
    .map((item) => ({
      productId: item.productId,
      name: productMap.get(item.productId)!.name,
      oldPrice: item.unitPrice,
      newPrice: productMap.get(item.productId)!.price_clp,
    }));

  if (priceChanges.length > 0) {
    return NextResponse.json({ error: "PRICE_CHANGED", priceChanges }, { status: 409 });
  }

  // ── 6. Calculate server-side total (never trust frontend prices) ──────────
  const totalCLP = body.items.reduce(
    (sum, item) => sum + productMap.get(item.productId)!.price_clp * item.quantity,
    0
  );

  // ── 7. Create order record ────────────────────────────────────────────────
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: orderRaw, error: orderError } = await (supabase as any)
    .from("orders")
    .insert({
      venue_id: venue.id,
      session_id: body.sessionId,
      station_id: body.stationId ?? null,
      customer_phone: body.customerPhone ?? null,
      status: "pending",
      total_clp: totalCLP,
      notes: body.orderNotes ?? null,
    })
    .select("id, order_number")
    .single();

  if (orderError || !orderRaw) {
    console.error("[POST /api/orders] order insert error:", orderError);
    return NextResponse.json({ error: "SERVER_ERROR" }, { status: 500 });
  }

  const order = orderRaw as OrderRow;

  // ── 8. Insert order items ─────────────────────────────────────────────────
  const orderItemsPayload = body.items.map((item) => ({
    order_id: order.id,
    product_id: item.productId,
    product_name: productMap.get(item.productId)!.name,
    quantity: item.quantity,
    unit_price_clp: productMap.get(item.productId)!.price_clp,
    notes: item.notes ?? null,
  }));

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { error: itemsError } = await (supabase as any)
    .from("order_items")
    .insert(orderItemsPayload);

  if (itemsError) {
    console.error("[POST /api/orders] order_items insert error:", itemsError);
    // Roll back: cancel the order so it can never be paid
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await (supabase as any).from("orders").update({ status: "cancelled" }).eq("id", order.id);
    return NextResponse.json({ error: "SERVER_ERROR" }, { status: 500 });
  }

  // ── 9. Create Mercado Pago preference ─────────────────────────────────────
  let preferenceId: string;
  try {
    preferenceId = await createPreference({
      accessToken: venue.mp_access_token,
      items: body.items.map((item) => ({
        title: productMap.get(item.productId)!.name,
        quantity: item.quantity,
        unit_price: productMap.get(item.productId)!.price_clp,
        currency_id: "CLP" as const,
      })),
      orderId: order.id,
      venueSlug: venue.slug,
    });
  } catch (err) {
    const errMsg = err instanceof Error ? err.message : String(err);
    const errCause = (err as any)?.cause;
    console.error("[POST /api/orders] MP preference error:", errMsg, errCause);
    // Roll back
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await (supabase as any).from("orders").update({ status: "cancelled" }).eq("id", order.id);
    return NextResponse.json({ error: "PAYMENT_INIT_FAILED", detail: errMsg }, { status: 502 });
  }

  // ── 10. Done ──────────────────────────────────────────────────────────────
  return NextResponse.json({ orderId: order.id, preferenceId }, { status: 201 });
}
