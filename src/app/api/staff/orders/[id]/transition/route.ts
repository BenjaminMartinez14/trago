import { NextResponse } from "next/server";
import { getStaffTokenFromRequest, verifyStaffToken } from "@/lib/staff-auth";
import { createServiceClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

const ALLOWED_TRANSITIONS: Record<string, { from: string; to: string }> = {
  accept: { from: "paid", to: "preparing" },
  mark_ready: { from: "preparing", to: "ready" },
  deliver: { from: "ready", to: "delivered" },
};

export async function PATCH(
  request: Request,
  { params }: { params: { id: string } }
) {
  const token = getStaffTokenFromRequest(request);
  if (!token) return NextResponse.json({ error: "UNAUTHORIZED" }, { status: 401 });

  const staff = await verifyStaffToken(token);
  if (!staff) return NextResponse.json({ error: "UNAUTHORIZED" }, { status: 401 });

  let body: { action: string };
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

  // Fetch order
  const { data: order } = await (service as any)
    .from("orders")
    .select("id, venue_id, status, order_number")
    .eq("id", params.id)
    .single() as { data: { id: string; venue_id: string; status: string; order_number: number } | null };

  if (!order) {
    return NextResponse.json({ error: "NOT_FOUND" }, { status: 404 });
  }

  if (order.venue_id !== staff.venueId) {
    return NextResponse.json({ error: "FORBIDDEN" }, { status: 403 });
  }

  // Optimistic concurrency: only update if status matches expected "from"
  if (order.status !== transition.from) {
    return NextResponse.json(
      { error: "INVALID_TRANSITION", currentStatus: order.status, expectedStatus: transition.from },
      { status: 409 }
    );
  }

  const { error } = await (service as any)
    .from("orders")
    .update({ status: transition.to, updated_at: new Date().toISOString() })
    .eq("id", params.id)
    .eq("status", transition.from);

  if (error) {
    return NextResponse.json({ error: "DB_ERROR" }, { status: 500 });
  }

  return NextResponse.json({ success: true, newStatus: transition.to });
}
