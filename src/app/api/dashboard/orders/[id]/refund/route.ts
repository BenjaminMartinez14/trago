import { NextResponse } from "next/server";
import { createClient, createServiceClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

export async function POST(
  _request: Request,
  { params }: { params: { id: string } }
) {
  // Auth: dashboard user
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "UNAUTHORIZED" }, { status: 401 });

  const service = createServiceClient();

  // Fetch order + venue MP token
  const { data: orderRaw } = await (service as any)
    .from("orders")
    .select("id, status, mp_payment_id, venue_id, venues!inner(mp_access_token)")
    .eq("id", params.id)
    .single();

  if (!orderRaw) return NextResponse.json({ error: "NOT_FOUND" }, { status: 404 });
  const order = orderRaw as { id: string; status: string; mp_payment_id: string | null; venue_id: string; venues: { mp_access_token: string } };

  if (!["paid", "preparing", "ready", "delivered", "cancelled"].includes(order.status)) {
    return NextResponse.json({ error: "INVALID_STATUS", currentStatus: order.status }, { status: 409 });
  }

  // Call MP refund API (only if we have a real payment id)
  let mpRefundId: string | null = null;
  if (order.mp_payment_id && !order.mp_payment_id.startsWith("demo-") && !order.mp_payment_id.startsWith("test-")) {
    try {
      const mpRes = await fetch(`https://api.mercadopago.com/v1/payments/${order.mp_payment_id}/refunds`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${order.venues.mp_access_token}`,
          "Content-Type": "application/json",
          "X-Idempotency-Key": `refund-${order.id}`,
        },
        body: JSON.stringify({}),
      });
      if (!mpRes.ok) {
        const errBody = await mpRes.text().catch(() => "");
        console.error(`[refund] MP refund failed: ${mpRes.status}`, errBody);
        return NextResponse.json({ error: "MP_REFUND_FAILED", status: mpRes.status }, { status: 502 });
      }
      const mpJson = await mpRes.json();
      mpRefundId = String(mpJson.id ?? "");
    } catch (err) {
      console.error("[refund] MP call threw:", err);
      return NextResponse.json({ error: "MP_REFUND_FAILED" }, { status: 502 });
    }
  }

  // Mark order refunded
  const { error } = await (service as any)
    .from("orders")
    .update({
      status: "refunded",
      refunded_at: new Date().toISOString(),
      mp_refund_id: mpRefundId,
      updated_at: new Date().toISOString(),
    })
    .eq("id", order.id);

  if (error) {
    console.error("[refund] DB update failed:", error);
    return NextResponse.json({ error: "DB_ERROR" }, { status: 500 });
  }

  return NextResponse.json({ success: true, refundId: mpRefundId });
}
