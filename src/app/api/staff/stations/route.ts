import { NextResponse } from "next/server";
import { getStaffTokenFromRequest, verifyStaffToken } from "@/lib/staff-auth";
import { createServiceClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const token = getStaffTokenFromRequest(request);
  if (!token) return NextResponse.json({ error: "UNAUTHORIZED" }, { status: 401 });

  const staff = await verifyStaffToken(token);
  if (!staff) return NextResponse.json({ error: "UNAUTHORIZED" }, { status: 401 });

  const service = createServiceClient();
  const { data } = await service
    .from("stations")
    .select("id, name, slug")
    .eq("venue_id", staff.venueId)
    .eq("active", true)
    .order("created_at", { ascending: true });

  return NextResponse.json({ stations: data ?? [] });
}
