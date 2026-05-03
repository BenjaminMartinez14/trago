import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createServiceClient } from "@/lib/supabase/server";
import type { Order, OrderItem } from "@/lib/supabase/types";

export const dynamic = "force-dynamic";

export async function GET() {
  // Auth check
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "UNAUTHORIZED" }, { status: 401 });
  }

  const service = createServiceClient();

  // Today's date range (UTC)
  const today = new Date();
  today.setUTCHours(0, 0, 0, 0);
  const todayStart = today.toISOString();

  // Fetch ALL of today's orders (all statuses — needed for conversion funnel)
  const { data: allOrdersRaw } = await service
    .from("orders")
    .select("*")
    .gte("created_at", todayStart)
    .order("created_at", { ascending: true });

  const allOrders = (allOrdersRaw ?? []) as Order[];

  // ── Revenue orders (paid/preparing/ready/delivered) ───────────────────────
  const revenueOrders = allOrders.filter((o) =>
    ["paid", "preparing", "ready", "delivered"].includes(o.status)
  );

  const revenue = revenueOrders.reduce((sum, o) => sum + o.total_clp, 0);
  const tips    = revenueOrders.reduce((sum, o) => sum + ((o as any).tip_clp ?? 0), 0);
  const orderCount = revenueOrders.length;
  const avgOrderValue = orderCount > 0 ? Math.round(revenue / orderCount) : 0;

  // ── Conversion funnel ─────────────────────────────────────────────────────
  const initiated = allOrders.filter((o) => o.status !== "pending").length; // reached checkout
  const paid      = allOrders.filter((o) => ["paid","preparing","ready","delivered"].includes(o.status)).length;
  const delivered = allOrders.filter((o) => o.status === "delivered").length;
  const cancelled = allOrders.filter((o) => o.status === "cancelled").length;
  const pending   = allOrders.filter((o) => o.status === "pending").length;

  // ── Hourly revenue breakdown (0-23) ──────────────────────────────────────
  const hourlyMap: { revenue: number; orders: number }[] = Array.from({ length: 24 }, () => ({
    revenue: 0,
    orders: 0,
  }));
  for (const o of revenueOrders) {
    const hour = new Date(o.created_at).getHours();
    hourlyMap[hour].revenue += o.total_clp + ((o as any).tip_clp ?? 0);
    hourlyMap[hour].orders  += 1;
  }
  const hourlyRevenue = hourlyMap.map((h, i) => ({ hour: i, ...h }));

  // ── Top products ──────────────────────────────────────────────────────────
  let topProducts: { name: string; quantity: number; revenue: number }[] = [];

  if (revenueOrders.length > 0) {
    const orderIds = revenueOrders.map((o) => o.id);
    const { data: itemsRaw } = await service
      .from("order_items")
      .select("product_id, product_name, quantity, unit_price_clp")
      .in("order_id", orderIds);

    const items = (itemsRaw ?? []) as Pick<
      OrderItem, "product_id" | "product_name" | "quantity" | "unit_price_clp"
    >[];

    const totals: Record<string, { name: string; quantity: number; revenue: number }> = {};
    for (const item of items) {
      if (!totals[item.product_id]) {
        totals[item.product_id] = { name: item.product_name, quantity: 0, revenue: 0 };
      }
      totals[item.product_id].quantity += item.quantity;
      totals[item.product_id].revenue  += item.unit_price_clp * item.quantity;
    }

    topProducts = Object.values(totals)
      .sort((a, b) => b.revenue - a.revenue)
      .slice(0, 5);
  }

  return NextResponse.json({
    revenue,
    tips,
    orderCount,
    avgOrderValue,
    funnel: { pending, initiated, paid, delivered, cancelled },
    hourlyRevenue,
    topProducts,
  });
}
