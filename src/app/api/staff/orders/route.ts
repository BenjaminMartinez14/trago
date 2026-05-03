import { NextResponse } from "next/server";
import { getStaffTokenFromRequest, verifyStaffToken } from "@/lib/staff-auth";
import { createServiceClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const token = getStaffTokenFromRequest(request);
  if (!token) return NextResponse.json({ error: "UNAUTHORIZED" }, { status: 401 });

  const staff = await verifyStaffToken(token);
  if (!staff) return NextResponse.json({ error: "UNAUTHORIZED" }, { status: 401 });

  const url = new URL(request.url);
  const stationId = url.searchParams.get("stationId");

  const service = createServiceClient();

  // Fetch orders and items in separate queries — the embedded join (select *,order_items(*))
  // can return stale data via PostgREST's query planner cache.
  const { data: ordersRaw } = await service
    .from("orders")
    .select("*")
    .eq("venue_id", staff.venueId)
    .order("created_at", { ascending: true });

  const activeStatuses = new Set(["preparing", "ready"]);
  const filteredOrders = (ordersRaw ?? []).filter((o: { status: string; station_id: string | null }) =>
    activeStatuses.has(o.status) &&
    (!stationId || o.station_id === stationId || o.station_id === null)
  );

  if (filteredOrders.length === 0) {
    return NextResponse.json({ orders: [] });
  }

  const orderIds = filteredOrders.map((o: { id: string }) => o.id);
  const { data: itemsRaw } = await service
    .from("order_items")
    .select("*")
    .in("order_id", orderIds);

  const itemsByOrder = (itemsRaw ?? []).reduce((acc: Record<string, unknown[]>, item: { order_id: string }) => {
    if (!acc[item.order_id]) acc[item.order_id] = [];
    acc[item.order_id].push(item);
    return acc;
  }, {} as Record<string, unknown[]>);

  const orders = filteredOrders.map((o: { id: string }) => ({
    ...o,
    order_items: itemsByOrder[o.id] ?? [],
  }));

  return NextResponse.json({ orders });
}
