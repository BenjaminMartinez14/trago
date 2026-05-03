import { NextResponse } from "next/server";
import { getStaffTokenFromRequest, verifyStaffToken } from "@/lib/staff-auth";
import { createServiceClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

const ALLOWED_TRANSITIONS: Record<string, { from: string | string[]; to: string }> = {
  scan:   { from: "paid",                          to: "preparing" },
  deliver: { from: ["preparing", "ready"],          to: "delivered" },
  cancel: { from: ["paid", "preparing", "ready"],   to: "cancelled" },
};

export async function PATCH(
  request: Request,
  { params }: { params: { id: string } }
) {
  const token = getStaffTokenFromRequest(request);
  if (!token) return NextResponse.json({ error: "UNAUTHORIZED" }, { status: 401 });

  const staff = await verifyStaffToken(token);
  if (!staff) return NextResponse.json({ error: "UNAUTHORIZED" }, { status: 401 });

  let body: { action: string; stationId?: string | null };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "BAD_REQUEST" }, { status: 400 });
  }

  const transition = ALLOWED_TRANSITIONS[body.action];
  if (!transition) {
    return NextResponse.json({ error: "INVALID_ACTION" }, { status: 400 });
  }

  const service = createServiceClient();

  const { data: order } = await (service as any)
    .from("orders")
    .select("*")
    .eq("id", params.id)
    .single() as { data: { id: string; venue_id: string; status: string; order_number: number; station_id: string | null } | null };

  if (!order) {
    return NextResponse.json({ error: "NOT_FOUND" }, { status: 404 });
  }

  if (order.venue_id !== staff.venueId) {
    return NextResponse.json({ error: "FORBIDDEN" }, { status: 403 });
  }

  const fromStatuses = Array.isArray(transition.from) ? transition.from : [transition.from];
  const { error, data: updated } = await (service as any)
    .from("orders")
    .update({ status: transition.to, updated_at: new Date().toISOString() })
    .eq("id", params.id)
    .eq("venue_id", staff.venueId)
    .in("status", fromStatuses)
    .select("id");

  if (error) {
    return NextResponse.json({ error: "DB_ERROR" }, { status: 500 });
  }

  if (!updated || updated.length === 0) {
    const { data: current } = await (service as any)
      .from("orders")
      .select("status")
      .eq("id", params.id)
      .single() as { data: { status: string } | null };
    return NextResponse.json(
      { error: "INVALID_TRANSITION", currentStatus: current?.status ?? "unknown", expectedStatus: transition.from },
      { status: 409 }
    );
  }

  // On scan: assign station if order had none
  if (body.action === "scan" && body.stationId && order.station_id === null) {
    await (service as any)
      .from("orders")
      .update({ station_id: body.stationId })
      .eq("id", params.id);
  }

  return NextResponse.json({ success: true, newStatus: transition.to });
}
