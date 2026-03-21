import { NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/server";
import { verifyStaffToken, getStaffTokenFromRequest } from "@/lib/staff-auth";
import type { Order } from "@/lib/supabase/types";

export async function PATCH(
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

  // Fetch current order
  const { data: orderRaw } = await supabase
    .from("orders")
    .select("id, status, venue_id")
    .eq("id", params.id)
    .single();

  const order = orderRaw as Pick<Order, "id" | "status" | "venue_id"> | null;

  if (!order) {
    return NextResponse.json({ error: "ORDER_NOT_FOUND" }, { status: 404 });
  }

  // Venue check
  if (order.venue_id !== staff.venueId) {
    return NextResponse.json({ error: "WRONG_VENUE" }, { status: 403 });
  }

  // Status check
  if (order.status === "delivered") {
    return NextResponse.json({ error: "ALREADY_DELIVERED" }, { status: 409 });
  }
  if (order.status === "cancelled") {
    return NextResponse.json({ error: "ORDER_CANCELLED" }, { status: 409 });
  }
  if (!["paid", "preparing", "ready"].includes(order.status)) {
    return NextResponse.json({ error: "ORDER_NOT_PAYABLE" }, { status: 409 });
  }

  // Mark delivered
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  await (supabase as any)
    .from("orders")
    .update({ status: "delivered" })
    .eq("id", order.id);

  return NextResponse.json({ success: true });
}
