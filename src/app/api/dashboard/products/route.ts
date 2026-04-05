import { NextResponse } from "next/server";
import { createClient, createServiceClient } from "@/lib/supabase/server";
import type { Product } from "@/lib/supabase/types";

export const dynamic = "force-dynamic";

export async function GET() {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "UNAUTHORIZED" }, { status: 401 });

  const service = createServiceClient();
  const { data } = await service
    .from("products")
    .select("*")
    .order("display_order", { ascending: true });

  return NextResponse.json({ products: (data ?? []) as Product[] });
}

export async function POST(request: Request) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "UNAUTHORIZED" }, { status: 401 });

  let body: {
    venue_id: string;
    category_id: string;
    name: string;
    description?: string | null;
    price_clp: number;
    image_url?: string | null;
    available?: boolean;
    display_order?: number;
  };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "BAD_REQUEST" }, { status: 400 });
  }

  if (!body.venue_id || !body.category_id || !body.name || !body.price_clp) {
    return NextResponse.json({ error: "MISSING_FIELDS" }, { status: 400 });
  }

  const service = createServiceClient();
  const { data, error } = await (service as any)
    .from("products")
    .insert({
      venue_id: body.venue_id,
      category_id: body.category_id,
      name: body.name,
      description: body.description ?? null,
      price_clp: body.price_clp,
      image_url: body.image_url ?? null,
      available: body.available ?? true,
      display_order: body.display_order ?? 0,
    })
    .select()
    .single();

  if (error) {
    return NextResponse.json({ error: "DB_ERROR" }, { status: 500 });
  }

  return NextResponse.json({ product: data as Product }, { status: 201 });
}
