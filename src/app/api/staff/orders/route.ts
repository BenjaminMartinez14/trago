import { NextResponse } from "next/server";
import { getStaffTokenFromRequest, verifyStaffToken } from "@/lib/staff-auth";
import { createServiceClient } from "@/lib/supabase/server";

export async function GET(request: Request) {
  const token = getStaffTokenFromRequest(request);
  if (!token) return NextResponse.json({ error: "UNAUTHORIZED" }, { status: 401 });

  const staff = await verifyStaffToken(token);
  if (!staff) return NextResponse.json({ error: "UNAUTHORIZED" }, { status: 401 });

  const service = createServiceClient();
  const { data } = await service
    .from("orders")
    .select("*, order_items(*)")
    .eq("venue_id", staff.venueId)
    .in("status", ["paid", "preparing", "ready"])
    .order("created_at", { ascending: true });

  return NextResponse.json({ orders: data ?? [] });
}
