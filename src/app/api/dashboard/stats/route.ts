import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createServiceClient } from "@/lib/supabase/server";
import type { Order, OrderItem } from "@/lib/supabase/types";

export const dynamic = "force-dynamic";

type RangePreset = "today" | "7d" | "30d" | "custom";

function resolveRange(searchParams: URLSearchParams): { from: Date; to: Date; preset: RangePreset } {
  const preset = (searchParams.get("range") ?? "today") as RangePreset;
  const now = new Date();

  if (preset === "custom") {
    const from = new Date(searchParams.get("from") ?? now);
    const to   = new Date(searchParams.get("to")   ?? now);
    return { from, to, preset };
  }
  if (preset === "7d") {
    const from = new Date(now); from.setDate(now.getDate() - 6); from.setHours(0, 0, 0, 0);
    return { from, to: now, preset };
  }
  if (preset === "30d") {
    const from = new Date(now); from.setDate(now.getDate() - 29); from.setHours(0, 0, 0, 0);
    return { from, to: now, preset };
  }
  // today
  const from = new Date(now); from.setHours(0, 0, 0, 0);
  return { from, to: now, preset: "today" };
}

function summarize(orders: Order[]) {
  const revenueOrders = orders.filter((o) => ["paid","preparing","ready","delivered"].includes(o.status));
  const revenue = revenueOrders.reduce((s, o) => s + o.total_clp, 0);
  const tips    = revenueOrders.reduce((s, o) => s + ((o as any).tip_clp ?? 0), 0);
  const orderCount = revenueOrders.length;
  const avgOrderValue = orderCount > 0 ? Math.round(revenue / orderCount) : 0;
  const initiated = orders.filter((o) => o.status !== "pending").length;
  const paid      = revenueOrders.length;
  const delivered = orders.filter((o) => o.status === "delivered").length;
  const cancelled = orders.filter((o) => o.status === "cancelled").length;
  const pending   = orders.filter((o) => o.status === "pending").length;
  return { revenue, tips, orderCount, avgOrderValue, funnel: { pending, initiated, paid, delivered, cancelled }, revenueOrders };
}

export async function GET(request: Request) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "UNAUTHORIZED" }, { status: 401 });

  const { searchParams } = new URL(request.url);
  const { from, to, preset } = resolveRange(searchParams);

  // Previous period of equal length, ending right before `from`
  const periodMs = to.getTime() - from.getTime();
  const prevTo   = new Date(from.getTime() - 1);
  const prevFrom = new Date(prevTo.getTime() - periodMs);

  const service = createServiceClient();

  // Fetch current + previous period in parallel
  const [currentRes, previousRes] = await Promise.all([
    service.from("orders").select("*").gte("created_at", from.toISOString()).lte("created_at", to.toISOString()).order("created_at", { ascending: true }),
    service.from("orders").select("*").gte("created_at", prevFrom.toISOString()).lte("created_at", prevTo.toISOString()),
  ]);

  const currentOrders  = (currentRes.data  ?? []) as Order[];
  const previousOrders = (previousRes.data ?? []) as Order[];

  const cur = summarize(currentOrders);
  const prv = summarize(previousOrders);

  // ── Daily trend (one bucket per local day in range) ─────────────────────────
  const dayMs = 24 * 60 * 60 * 1000;
  const days  = Math.max(1, Math.ceil((to.getTime() - from.getTime()) / dayMs) + 1);
  const dailyRevenue: { date: string; revenue: number; orders: number }[] = [];
  for (let i = 0; i < days; i++) {
    const d = new Date(from.getTime() + i * dayMs);
    d.setHours(0, 0, 0, 0);
    dailyRevenue.push({ date: d.toISOString().slice(0, 10), revenue: 0, orders: 0 });
  }
  for (const o of cur.revenueOrders) {
    const d = new Date(o.created_at); d.setHours(0, 0, 0, 0);
    const key = d.toISOString().slice(0, 10);
    const bucket = dailyRevenue.find((b) => b.date === key);
    if (bucket) {
      bucket.revenue += o.total_clp + ((o as any).tip_clp ?? 0);
      bucket.orders  += 1;
    }
  }

  // ── Hourly heatmap by day of week (0=Sun … 6=Sat) ──────────────────────────
  const heatmap: { dow: number; hour: number; revenue: number; orders: number }[] = [];
  for (let dow = 0; dow < 7; dow++) for (let h = 0; h < 24; h++) heatmap.push({ dow, hour: h, revenue: 0, orders: 0 });
  for (const o of cur.revenueOrders) {
    const dt = new Date(o.created_at);
    const cell = heatmap.find((c) => c.dow === dt.getDay() && c.hour === dt.getHours());
    if (cell) {
      cell.revenue += o.total_clp + ((o as any).tip_clp ?? 0);
      cell.orders  += 1;
    }
  }

  // ── Hourly revenue (kept for "today" view) ─────────────────────────────────
  const hourlyMap: { revenue: number; orders: number }[] = Array.from({ length: 24 }, () => ({ revenue: 0, orders: 0 }));
  for (const o of cur.revenueOrders) {
    const hour = new Date(o.created_at).getHours();
    hourlyMap[hour].revenue += o.total_clp + ((o as any).tip_clp ?? 0);
    hourlyMap[hour].orders  += 1;
  }
  const hourlyRevenue = hourlyMap.map((h, i) => ({ hour: i, ...h }));

  // ── Top products ──────────────────────────────────────────────────────────
  let topProducts: { name: string; quantity: number; revenue: number }[] = [];
  if (cur.revenueOrders.length > 0) {
    const orderIds = cur.revenueOrders.map((o) => o.id);
    const { data: itemsRaw } = await service
      .from("order_items")
      .select("product_id, product_name, quantity, unit_price_clp")
      .in("order_id", orderIds);
    const items = (itemsRaw ?? []) as Pick<OrderItem, "product_id" | "product_name" | "quantity" | "unit_price_clp">[];
    const totals: Record<string, { name: string; quantity: number; revenue: number }> = {};
    for (const item of items) {
      if (!totals[item.product_id]) totals[item.product_id] = { name: item.product_name, quantity: 0, revenue: 0 };
      totals[item.product_id].quantity += item.quantity;
      totals[item.product_id].revenue  += item.unit_price_clp * item.quantity;
    }
    topProducts = Object.values(totals).sort((a, b) => b.revenue - a.revenue).slice(0, 10);
  }

  return NextResponse.json({
    range: { preset, from: from.toISOString(), to: to.toISOString() },
    revenue: cur.revenue,
    tips: cur.tips,
    orderCount: cur.orderCount,
    avgOrderValue: cur.avgOrderValue,
    funnel: cur.funnel,
    previous: {
      revenue: prv.revenue,
      orderCount: prv.orderCount,
      avgOrderValue: prv.avgOrderValue,
      tips: prv.tips,
    },
    dailyRevenue,
    hourlyRevenue,
    heatmap,
    topProducts,
  });
}
