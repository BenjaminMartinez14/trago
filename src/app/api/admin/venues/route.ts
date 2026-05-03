import { NextResponse } from "next/server";
import { createClient, createServiceClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

function isSuperAdmin(email: string | undefined): boolean {
  if (!email) return false;
  const allow = (process.env.SUPER_ADMIN_EMAILS ?? "").split(",").map((s) => s.trim().toLowerCase()).filter(Boolean);
  return allow.includes(email.toLowerCase());
}

export async function GET() {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "UNAUTHORIZED" }, { status: 401 });
  if (!isSuperAdmin(user.email)) return NextResponse.json({ error: "FORBIDDEN" }, { status: 403 });

  const service = createServiceClient();

  const { data: venuesRaw } = await service.from("venues").select("*").order("created_at", { ascending: true });
  const venues = (venuesRaw ?? []) as Array<{ id: string; name: string; slug: string; active: boolean; commission_pct: number; created_at: string }>;

  // 30-day cutoff for monthly GMV
  const cutoff = new Date(); cutoff.setDate(cutoff.getDate() - 30);
  const cutoffIso = cutoff.toISOString();

  const { data: ordersRaw } = await service
    .from("orders")
    .select("venue_id, status, total_clp, tip_clp, created_at")
    .gte("created_at", cutoffIso);
  const orders = (ordersRaw ?? []) as Array<{ venue_id: string; status: string; total_clp: number; tip_clp: number | null; created_at: string }>;

  const result = venues.map((v) => {
    const venueOrders = orders.filter((o) => o.venue_id === v.id);
    const revenueOrders = venueOrders.filter((o) => ["paid","preparing","ready","delivered"].includes(o.status));
    const gmv = revenueOrders.reduce((s, o) => s + o.total_clp + (o.tip_clp ?? 0), 0);
    const commission = Math.round(gmv * (v.commission_pct / 100));
    const orderCount = revenueOrders.length;
    const lastOrderAt = venueOrders.length > 0
      ? venueOrders.map((o) => o.created_at).sort().pop()
      : null;
    return {
      id: v.id,
      name: v.name,
      slug: v.slug,
      active: v.active,
      commissionPct: v.commission_pct,
      monthlyGmv: gmv,
      monthlyCommission: commission,
      orderCount,
      lastOrderAt,
    };
  });

  // Aggregate roll-up
  const total = {
    gmv: result.reduce((s, v) => s + v.monthlyGmv, 0),
    commission: result.reduce((s, v) => s + v.monthlyCommission, 0),
    orders: result.reduce((s, v) => s + v.orderCount, 0),
    venues: result.length,
    activeVenues: result.filter((v) => v.active).length,
  };

  return NextResponse.json({ venues: result, total });
}
