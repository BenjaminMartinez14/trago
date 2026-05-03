import { NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

// Auto-cancels paid orders older than STALE_THRESHOLD_HOURS that were never scanned.
// Triggered by Vercel Cron (configured in vercel.json) — Vercel sends the
// `Authorization: Bearer ${CRON_SECRET}` header when invoking.

const STALE_THRESHOLD_HOURS = 4;

export async function GET(request: Request) {
  const auth = request.headers.get("authorization");
  if (!process.env.CRON_SECRET || auth !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "UNAUTHORIZED" }, { status: 401 });
  }

  const cutoff = new Date(Date.now() - STALE_THRESHOLD_HOURS * 60 * 60 * 1000).toISOString();
  const service = createServiceClient();

  const { data: cancelled, error } = await (service as any)
    .from("orders")
    .update({ status: "cancelled", updated_at: new Date().toISOString() })
    .eq("status", "paid")
    .lt("created_at", cutoff)
    .select("id, order_number, venue_id");

  if (error) {
    console.error("[cron/cleanup] DB error:", error);
    return NextResponse.json({ error: "DB_ERROR", detail: error.message }, { status: 500 });
  }

  const count = cancelled?.length ?? 0;
  console.log(`[cron/cleanup] auto-cancelled ${count} stale paid orders (>${STALE_THRESHOLD_HOURS}h old)`);

  return NextResponse.json({
    success: true,
    cancelledCount: count,
    thresholdHours: STALE_THRESHOLD_HOURS,
    cancelledOrders: cancelled?.map((o: any) => ({ id: o.id, order_number: o.order_number })) ?? [],
  });
}
