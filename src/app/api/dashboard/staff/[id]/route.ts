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

// PATCH — update name, role, active, or reset PIN
export async function PATCH(request: Request, { params }: { params: { id: string } }) {
  const venueId = await getAuthenticatedVenueId();
  if (!venueId) return NextResponse.json({ error: "UNAUTHORIZED" }, { status: 401 });

  let body: { name?: string; role?: string; active?: boolean; pin?: string };
  try { body = await request.json(); } catch {
    return NextResponse.json({ error: "BAD_REQUEST" }, { status: 400 });
  }

  // Validate venue ownership
  const service = createServiceClient();
  const { data: existing } = await service
    .from("staff_users").select("id").eq("id", params.id).eq("venue_id", venueId).single();
  if (!existing) return NextResponse.json({ error: "NOT_FOUND" }, { status: 404 });

  const updates: Record<string, unknown> = {};
  if (body.name !== undefined) updates.name = body.name.trim();
  if (body.role !== undefined) {
    if (!["scanner", "admin"].includes(body.role)) return NextResponse.json({ error: "invalid role" }, { status: 400 });
    updates.role = body.role;
  }
  if (body.active !== undefined) updates.active = body.active;
  if (body.pin !== undefined) {
    if (!/^\d{4}$/.test(body.pin)) return NextResponse.json({ error: "pin must be 4 digits" }, { status: 400 });
    updates.pin_hash = await bcrypt.hash(body.pin, 10);
  }

  if (Object.keys(updates).length === 0) return NextResponse.json({ error: "nothing to update" }, { status: 400 });

  const { data, error } = await (service as any)
    .from("staff_users")
    .update(updates)
    .eq("id", params.id)
    .select("id, name, role, active, created_at")
    .single();

  if (error) return NextResponse.json({ error: "DB_ERROR" }, { status: 500 });
  return NextResponse.json({ staff: data });
}

// DELETE — remove staff member
export async function DELETE(_request: Request, { params }: { params: { id: string } }) {
  const venueId = await getAuthenticatedVenueId();
  if (!venueId) return NextResponse.json({ error: "UNAUTHORIZED" }, { status: 401 });

  const service = createServiceClient();
  const { data: existing } = await service
    .from("staff_users").select("id").eq("id", params.id).eq("venue_id", venueId).single();
  if (!existing) return NextResponse.json({ error: "NOT_FOUND" }, { status: 404 });

  const { error } = await service.from("staff_users").delete().eq("id", params.id);
  if (error) return NextResponse.json({ error: "DB_ERROR" }, { status: 500 });
  return NextResponse.json({ success: true });
}
