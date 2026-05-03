import { NextResponse } from "next/server";
import { createClient, createServiceClient } from "@/lib/supabase/server";
import bcrypt from "bcryptjs";

export const dynamic = "force-dynamic";

async function getAuthenticatedVenueId(): Promise<string | null> {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;
  const service = createServiceClient();
  const { data } = await service.from("venues").select("id").limit(1).single();
  return (data as any)?.id ?? null;
}

// GET — list all staff for the venue
export async function GET() {
  const venueId = await getAuthenticatedVenueId();
  if (!venueId) return NextResponse.json({ error: "UNAUTHORIZED" }, { status: 401 });

  const service = createServiceClient();
  const { data, error } = await service
    .from("staff_users")
    .select("id, name, role, active, created_at")
    .eq("venue_id", venueId)
    .order("created_at", { ascending: true });

  if (error) return NextResponse.json({ error: "DB_ERROR" }, { status: 500 });
  return NextResponse.json({ staff: data ?? [] });
}

// POST — create new staff member
export async function POST(request: Request) {
  const venueId = await getAuthenticatedVenueId();
  if (!venueId) return NextResponse.json({ error: "UNAUTHORIZED" }, { status: 401 });

  let body: { name: string; role: string; pin: string };
  try { body = await request.json(); } catch {
    return NextResponse.json({ error: "BAD_REQUEST" }, { status: 400 });
  }

  const { name, role, pin } = body;
  if (!name?.trim()) return NextResponse.json({ error: "name is required" }, { status: 400 });
  if (!["scanner", "admin"].includes(role)) return NextResponse.json({ error: "role must be scanner or admin" }, { status: 400 });
  if (!/^\d{4}$/.test(pin)) return NextResponse.json({ error: "pin must be 4 digits" }, { status: 400 });

  const pin_hash = await bcrypt.hash(pin, 10);
  const service = createServiceClient();

  const { data, error } = await (service as any)
    .from("staff_users")
    .insert({ venue_id: venueId, name: name.trim(), role, pin_hash, active: true })
    .select("id, name, role, active, created_at")
    .single();

  if (error) return NextResponse.json({ error: "DB_ERROR" }, { status: 500 });
  return NextResponse.json({ staff: data }, { status: 201 });
}
