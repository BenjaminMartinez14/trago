import { NextResponse } from "next/server";
import { MercadoPagoConfig, Payment } from "mercadopago";
import { createServiceClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

// ── Signature validation ─────────────────────────────────────────────────────
// Format: x-signature: ts=<unix>,v1=<hmac-sha256>
// Manifest: id:<data.id>;request-id:<x-request-id>;ts:<ts>

async function verifySignature(
  secret: string,
  xSignature: string,
  xRequestId: string,
  dataId: string
): Promise<boolean> {
  try {
    const parts = Object.fromEntries(
      xSignature.split(",").map((p) => p.split("=") as [string, string])
    );
    const { ts, v1 } = parts;
    if (!ts || !v1) return false;

    const manifest = `id:${dataId};request-id:${xRequestId};ts:${ts}`;
    const key = await crypto.subtle.importKey(
      "raw",
      new TextEncoder().encode(secret),
      { name: "HMAC", hash: "SHA-256" },
      false,
      ["sign"]
    );
    const sig = await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(manifest));
    const computed = Buffer.from(sig).toString("hex");
    return computed === v1;
  } catch {
    return false;
  }
}

// ── Handler ──────────────────────────────────────────────────────────────────

export async function POST(request: Request) {
  const xSignature = request.headers.get("x-signature") ?? "";
  const xRequestId = request.headers.get("x-request-id") ?? "";

  let body: Record<string, unknown>;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "BAD_REQUEST" }, { status: 400 });
  }

  // Only process payment events
  if (body.type !== "payment") {
    return NextResponse.json({ received: true });
  }

  const dataId = String((body.data as Record<string, unknown>)?.id ?? "");
  if (!dataId) return NextResponse.json({ error: "BAD_REQUEST" }, { status: 400 });

  // Validate signature
  const secret = process.env.MP_WEBHOOK_SECRET ?? "";
  if (secret && !(await verifySignature(secret, xSignature, xRequestId, dataId))) {
    return NextResponse.json({ error: "UNAUTHORIZED" }, { status: 401 });
  }

  // Fetch payment details from MP
  const mpClient = new MercadoPagoConfig({
    accessToken: process.env.MP_ACCESS_TOKEN ?? "",
  });
  const paymentClient = new Payment(mpClient);

  let payment: Awaited<ReturnType<typeof paymentClient.get>>;
  try {
    payment = await paymentClient.get({ id: dataId });
  } catch (err) {
    console.error("[webhook/mp] payment fetch error:", err);
    return NextResponse.json({ error: "SERVER_ERROR" }, { status: 500 });
  }

  const orderId = payment.external_reference;
  const mpStatus = payment.status;
  const mpPaymentId = String(payment.id ?? dataId);

  if (!orderId) {
    console.warn("[webhook/mp] no external_reference on payment", dataId);
    return NextResponse.json({ received: true });
  }

  // Map MP status → order status
  const newOrderStatus =
    mpStatus === "approved"
      ? "paid"
      : mpStatus === "rejected" || mpStatus === "cancelled"
      ? "cancelled"
      : null; // in_process / pending → no change

  if (!newOrderStatus) {
    return NextResponse.json({ received: true });
  }

  const supabase = createServiceClient();

  // Idempotency: fetch current order status
  const { data: orderRaw } = await supabase
    .from("orders")
    .select("id, status")
    .eq("id", orderId)
    .single();

  const order = orderRaw as { id: string; status: string } | null;

  if (!order) {
    console.warn("[webhook/mp] order not found:", orderId);
    return NextResponse.json({ received: true }); // don't retry
  }

  // Already in terminal state — idempotent, ignore
  if (order.status === newOrderStatus || order.status === "delivered") {
    return NextResponse.json({ received: true });
  }

  // Update order — Supabase Realtime will broadcast the change automatically
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  await (supabase as any)
    .from("orders")
    .update({
      status: newOrderStatus,
      mp_payment_id: mpPaymentId,
      mp_status: mpStatus,
    })
    .eq("id", orderId);

  return NextResponse.json({ received: true });
}
