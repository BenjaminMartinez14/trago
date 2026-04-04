import { NextResponse } from "next/server";
import { createClient, createServiceClient } from "@/lib/supabase/server";

export async function GET(_request: Request, { params }: { params: { id: string } }) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "UNAUTHORIZED" }, { status: 401 });

  const service = createServiceClient();
  const { data } = await service.from("station_products").select("product_id").eq("station_id", params.id);
  return NextResponse.json({ productIds: (data ?? []).map((r: any) => r.product_id) });
}

export async function PUT(request: Request, { params }: { params: { id: string } }) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "UNAUTHORIZED" }, { status: 401 });

  let body: { productIds: string[] };
  try { body = await request.json(); } catch { return NextResponse.json({ error: "BAD_REQUEST" }, { status: 400 }); }

  const service = createServiceClient();
  // Delete existing, insert new
  await (service as any).from("station_products").delete().eq("station_id", params.id);
  if (body.productIds.length > 0) {
    const rows = body.productIds.map((pid) => ({ station_id: params.id, product_id: pid }));
    await (service as any).from("station_products").insert(rows);
  }
  return NextResponse.json({ success: true });
}
