import { NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/server";
import { verifyStaffToken, getStaffTokenFromRequest } from "@/lib/staff-auth";
import type { Order, OrderItem } from "@/lib/supabase/types";

export const dynamic = "force-dynamic";

export async function GET(
  request: Request,
  { params }: { params: { id: string } }
) {
  // Auth
  const token = getStaffTokenFromRequest(request);
  const staff = token ? await verifyStaffToken(token) : null;
  if (!staff) {
    return NextResponse.json({ error: "UNAUTHORIZED" }, { status: 401 });
  }

  const supabase = createServiceClient();

  // Fetch order
  const { data: orderRaw } = await supabase
    .from("orders")
    .select("*")
    .eq("id", params.id)
    .single();

  const order = orderRaw as Order | null;

  if (!order) {
    return NextResponse.json({ error: "ORDER_NOT_FOUND" }, { status: 404 });
  }

  // Venue check
  if (order.venue_id !== staff.venueId) {
    return NextResponse.json({ error: "WRONG_VENUE" }, { status: 403 });
  }

  // Fetch items
  const { data: itemsRaw } = await supabase
    .from("order_items")
    .select("*")
    .eq("order_id", order.id);

  const items = (itemsRaw ?? []) as OrderItem[];

  return NextResponse.json({ order, items });
}
