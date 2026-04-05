import { NextResponse } from "next/server";
import { createClient, createServiceClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

export async function GET() {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "UNAUTHORIZED" }, { status: 401 });

  const service = createServiceClient();
  const { data } = await service
    .from("stations")
    .select("*, venues(slug, name)")
    .order("created_at", { ascending: true });

  return NextResponse.json({ stations: data ?? [] });
}

export async function POST(request: Request) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "UNAUTHORIZED" }, { status: 401 });

  let body: { venue_id: string; name: string; slug: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "BAD_REQUEST" }, { status: 400 });
  }

  if (!body.venue_id || !body.name?.trim() || !body.slug?.trim()) {
    return NextResponse.json({ error: "MISSING_FIELDS" }, { status: 400 });
  }

  const service = createServiceClient();
  const { data, error } = await (service as any)
    .from("stations")
    .insert({
      venue_id: body.venue_id,
      name: body.name.trim(),
      slug: body.slug.trim().toLowerCase().replace(/\s+/g, "-"),
    })
    .select("*, venues(slug, name)")
    .single();

  if (error) {
    if (error.code === "23505") {
      return NextResponse.json({ error: "SLUG_EXISTS" }, { status: 409 });
    }
    return NextResponse.json({ error: "DB_ERROR" }, { status: 500 });
  }

  // Auto-create a QR code linked to this station
  await (service as any)
    .from("qr_codes")
    .insert({ venue_id: data.venue_id, station_id: data.id, label: data.name });

  return NextResponse.json({ station: data }, { status: 201 });
}
