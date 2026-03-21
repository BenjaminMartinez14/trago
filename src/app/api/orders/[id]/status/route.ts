import { NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/server";

export async function GET(
  _request: Request,
  { params }: { params: { id: string } }
) {
  const supabase = createServiceClient();

  const { data: raw } = await supabase
    .from("orders")
    .select("status, order_number")
    .eq("id", params.id)
    .single();

  if (!raw) {
    return NextResponse.json({ error: "NOT_FOUND" }, { status: 404 });
  }

  const order = raw as { status: string; order_number: number };
  return NextResponse.json({ status: order.status, orderNumber: order.order_number });
}
