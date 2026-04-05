import { NextResponse } from "next/server";
import { createClient, createServiceClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

export async function PATCH(request: Request, { params }: { params: { id: string } }) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "UNAUTHORIZED" }, { status: 401 });

  let body: Partial<{ name: string; slug: string; active: boolean }>;
  try { body = await request.json(); } catch { return NextResponse.json({ error: "BAD_REQUEST" }, { status: 400 }); }

  const service = createServiceClient();
  const { data, error } = await (service as any).from("stations").update(body).eq("id", params.id).select().single();
  if (error) return NextResponse.json({ error: "DB_ERROR" }, { status: 500 });
  return NextResponse.json({ station: data });
}

export async function DELETE(_request: Request, { params }: { params: { id: string } }) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "UNAUTHORIZED" }, { status: 401 });

  const service = createServiceClient();
  await (service as any).from("stations").delete().eq("id", params.id);
  return NextResponse.json({ success: true });
}
