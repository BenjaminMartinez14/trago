import { NextResponse } from "next/server";
import { createClient, createServiceClient } from "@/lib/supabase/server";
import type { Category } from "@/lib/supabase/types";

export async function GET() {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "UNAUTHORIZED" }, { status: 401 });

  const service = createServiceClient();
  const { data } = await service
    .from("categories")
    .select("*")
    .order("display_order", { ascending: true });

  return NextResponse.json({ categories: (data ?? []) as Category[] });
}

export async function POST(request: Request) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "UNAUTHORIZED" }, { status: 401 });

  let body: { venue_id: string; name: string; display_order?: number };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "BAD_REQUEST" }, { status: 400 });
  }

  if (!body.venue_id || !body.name) {
    return NextResponse.json({ error: "MISSING_FIELDS" }, { status: 400 });
  }

  const service = createServiceClient();
  const { data, error } = await (service as any)
    .from("categories")
    .insert({
      venue_id: body.venue_id,
      name: body.name,
      display_order: body.display_order ?? 0,
    })
    .select()
    .single();

  if (error) {
    return NextResponse.json({ error: "DB_ERROR" }, { status: 500 });
  }

  return NextResponse.json({ category: data as Category }, { status: 201 });
}
