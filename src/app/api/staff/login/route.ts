import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { createServiceClient } from "@/lib/supabase/server";
import { signStaffToken } from "@/lib/staff-auth";
import type { Venue, StaffUser } from "@/lib/supabase/types";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  let body: { venueSlug?: string; pin?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "BAD_REQUEST" }, { status: 400 });
  }

  const { venueSlug, pin } = body;

  if (typeof venueSlug !== "string" || !venueSlug) {
    return NextResponse.json({ error: "venueSlug is required" }, { status: 400 });
  }
  if (typeof pin !== "string" || !/^\d{4}$/.test(pin)) {
    return NextResponse.json({ error: "pin must be a 4-digit string" }, { status: 400 });
  }

  const supabase = createServiceClient();

  // Fetch venue
  const { data: venueRaw } = await supabase
    .from("venues")
    .select("id, slug, active")
    .eq("slug", venueSlug)
    .single();

  const venue = venueRaw as Pick<Venue, "id" | "slug" | "active"> | null;

  if (!venue || !venue.active) {
    // Generic 401 — don't reveal whether venue exists
    return NextResponse.json({ error: "INVALID_CREDENTIALS" }, { status: 401 });
  }

  // Fetch all active staff for this venue
  const { data: staffRaw } = await supabase
    .from("staff_users")
    .select("id, name, pin_hash, role, active")
    .eq("venue_id", venue.id)
    .eq("active", true);

  const staffList = (staffRaw ?? []) as Pick<
    StaffUser,
    "id" | "name" | "pin_hash" | "role" | "active"
  >[];

  // Find the matching staff by comparing PIN against each hash
  // (small list — bcrypt compare is intentionally slow, so we stop at first match)
  let matched: (typeof staffList)[number] | null = null;
  for (const staff of staffList) {
    const ok = await bcrypt.compare(pin, staff.pin_hash);
    if (ok) {
      matched = staff;
      break;
    }
  }

  if (!matched) {
    return NextResponse.json({ error: "INVALID_CREDENTIALS" }, { status: 401 });
  }

  const token = await signStaffToken({
    sub: matched.id,
    venueId: venue.id,
    role: matched.role,
    name: matched.name,
  });

  return NextResponse.json({
    token,
    name: matched.name,
    role: matched.role,
    venueId: venue.id,
  });
}
