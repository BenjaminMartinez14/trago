import { NextResponse } from "next/server";
import { createClient, createServiceClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

export async function GET() {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "UNAUTHORIZED" }, { status: 401 });

  const service = createServiceClient();

  // 30-day window
  const cutoff = new Date(); cutoff.setDate(cutoff.getDate() - 30);
  const cutoffIso = cutoff.toISOString();

  const [stationsRes, ordersRes] = await Promise.all([
    service.from("stations").select("id, name, slug, active"),
    service.from("orders")
      .select("station_id, status, total_clp, tip_clp, created_at, updated_at")
      .gte("created_at", cutoffIso)
      .in("status", ["preparing","ready","delivered"]),
  ]);

  const stations = (stationsRes.data ?? []) as Array<{ id: string; name: string; slug: string; active: boolean }>;
  const orders   = (ordersRes.data   ?? []) as Array<{ station_id: string | null; status: string; total_clp: number; tip_clp: number | null; created_at: string; updated_at: string }>;

  // For each station, compute: orders, gmv, avg prep+deliver time (created_at → updated_at as proxy for total time)
  const result = stations.map((s) => {
    const venueOrders = orders.filter((o) => o.station_id === s.id);
    const orderCount = venueOrders.length;
    const gmv = venueOrders.reduce((sum, o) => sum + o.total_clp + (o.tip_clp ?? 0), 0);
    const totalSec = venueOrders.reduce((sum, o) =>
      sum + Math.max(0, (new Date(o.updated_at).getTime() - new Date(o.created_at).getTime()) / 1000), 0);
    const avgFulfillmentSec = orderCount > 0 ? Math.round(totalSec / orderCount) : 0;
    return {
      id: s.id,
      name: s.name,
      slug: s.slug,
      active: s.active,
      orderCount,
      gmv,
      avgFulfillmentSec,
      // orders/hr assumes 30-day, 4hr peak nights, ~8 nights/month → very rough
      ordersPerHour: orderCount > 0 ? +(orderCount / (8 * 4)).toFixed(1) : 0,
    };
  });

  // Include orders without a station_id (legacy / pre-station orders) as a synthetic "Sin estación" row
  const unassigned = orders.filter((o) => !o.station_id);
  if (unassigned.length > 0) {
    result.push({
      id: "unassigned",
      name: "Sin estación",
      slug: "",
      active: true,
      orderCount: unassigned.length,
      gmv: unassigned.reduce((sum, o) => sum + o.total_clp + (o.tip_clp ?? 0), 0),
      avgFulfillmentSec: 0,
      ordersPerHour: 0,
    });
  }

  return NextResponse.json({ stations: result });
}
