import { NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

// Public endpoint: kicks off a scripted demo order on the demo venue.
// Returns: { orderId, orderNumber, items, totalCLP } so the UI can link customer/staff/dashboard.

export async function POST() {
  if (!process.env.NEXT_PUBLIC_MP_PUBLIC_KEY?.startsWith("TEST-")) {
    return NextResponse.json({ error: "DEMO_DISABLED_IN_PROD" }, { status: 403 });
  }

  const service = createServiceClient();

  // Pick the first active venue (should be club-demo)
  const { data: venueRaw } = await (service as any)
    .from("venues").select("id, slug").eq("active", true).order("created_at").limit(1).single();
  if (!venueRaw) return NextResponse.json({ error: "NO_VENUE" }, { status: 404 });
  const venue = venueRaw as { id: string; slug: string };

  // Pick 2 random available products
  const { data: productsRaw } = await (service as any)
    .from("products")
    .select("id, name, price_clp")
    .eq("venue_id", venue.id)
    .eq("available", true)
    .limit(20);
  const products = (productsRaw ?? []) as Array<{ id: string; name: string; price_clp: number }>;
  if (products.length < 2) return NextResponse.json({ error: "NOT_ENOUGH_PRODUCTS" }, { status: 404 });

  const shuffled = [...products].sort(() => Math.random() - 0.5).slice(0, 2);
  const items = shuffled.map((p) => ({ productId: p.id, name: p.name, quantity: 1, unitPrice: p.price_clp }));
  const totalCLP = items.reduce((s, i) => s + i.unitPrice * i.quantity, 0);

  // Create order via POST /api/orders (call internal route to reuse validation + MP preference creation)
  const sessionId = crypto.randomUUID();

  // Inline insert (skip MP preference; we'll mark paid via test-pay anyway)
  const orderNumberRes = await (service as any).rpc?.('next_order_number', { p_venue_id: venue.id }).catch(() => null);
  const { data: orderRow, error: orderErr } = await (service as any)
    .from("orders")
    .insert({
      venue_id: venue.id,
      session_id: sessionId,
      status: "pending",
      total_clp: totalCLP,
      tip_clp: 0,
    })
    .select("id, order_number")
    .single();
  if (orderErr || !orderRow) return NextResponse.json({ error: "DB_ERROR", detail: orderErr?.message }, { status: 500 });

  await (service as any)
    .from("order_items")
    .insert(items.map((i) => ({
      order_id: orderRow.id,
      product_id: i.productId,
      product_name: i.name,
      quantity: i.quantity,
      unit_price_clp: i.unitPrice,
    })));

  // Mark as paid (skip MP entirely for demo)
  await (service as any)
    .from("orders")
    .update({ status: "paid", mp_payment_id: `demo-${Date.now()}`, mp_status: "approved", updated_at: new Date().toISOString() })
    .eq("id", orderRow.id);

  return NextResponse.json({
    orderId: orderRow.id,
    orderNumber: orderRow.order_number,
    venueSlug: venue.slug,
    items,
    totalCLP,
  });
}
