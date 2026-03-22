import { NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/server";
import { verifyStaffToken, getStaffTokenFromRequest } from "@/lib/staff-auth";
import type { Order } from "@/lib/supabase/types";

export async function PATCH(
  request: Request,
  { params }: { params: { id: string } }
) {
  const token = getStaffTokenFromRequest(request);
  const staff = token ? await verifyStaffToken(token) : null;
  if (!staff) {
    return NextResponse.json({ error: "UNAUTHORIZED" }, { status: 401 });
  }

  const { status } = await request.json();
  const allowed = ["paid", "preparing", "ready", "delivered"];
  if (!allowed.includes(status)) {
    return NextResponse.json({ error: "INVALID_STATUS" }, { status: 400 });
  }

  const supabase = createServiceClient();

  const { data: orderRaw } = await supabase
    .from("orders")
    .select("id, venue_id")
    .eq("id", params.id)
    .single();

  const order = orderRaw as Pick<Order, "id" | "venue_id"> | null;

  if (!order) {
    return NextResponse.json({ error: "ORDER_NOT_FOUND" }, { status: 404 });
  }
  if (order.venue_id !== staff.venueId) {
    return NextResponse.json({ error: "WRONG_VENUE" }, { status: 403 });
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  await (supabase as any)
    .from("orders")
    .update({ status })
    .eq("id", order.id);

  return NextResponse.json({ success: true });
}
