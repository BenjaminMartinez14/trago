import { NextResponse } from "next/server";
import { createClient, createServiceClient } from "@/lib/supabase/server";

export async function GET() {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "UNAUTHORIZED" }, { status: 401 });

  const service = createServiceClient();
  const { data } = await service
    .from("qr_codes")
    .select("*, venues(slug, name)")
    .order("created_at", { ascending: false });

  return NextResponse.json({ qrCodes: data ?? [] });
}

export async function POST(request: Request) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "UNAUTHORIZED" }, { status: 401 });

  let body: { slug: string; label: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "BAD_REQUEST" }, { status: 400 });
  }

  if (!body.slug?.trim() || !body.label?.trim()) {
    return NextResponse.json({ error: "MISSING_FIELDS" }, { status: 400 });
  }

  const service = createServiceClient();

  // Resolve slug to venue_id
  const { data: venue } = await (service as any)
    .from("venues")
    .select("id")
    .eq("slug", body.slug.trim())
    .single() as { data: { id: string } | null };

  if (!venue) {
    return NextResponse.json({ error: "VENUE_NOT_FOUND" }, { status: 404 });
  }

  const { data, error } = await (service as any)
    .from("qr_codes")
    .insert({ venue_id: venue.id, label: body.label.trim() })
    .select("*, venues(slug, name)")
    .single();

  if (error) {
    return NextResponse.json({ error: "DB_ERROR" }, { status: 500 });
  }

  return NextResponse.json({ qrCode: data }, { status: 201 });
}
