import { NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/server";

// Test-only endpoint — marks an order as paid without going through Mercado Pago.
// Only works when NEXT_PUBLIC_MP_PUBLIC_KEY starts with "TEST-".
export async function POST(_request: Request, { params }: { params: { id: string } }) {
  if (!process.env.NEXT_PUBLIC_MP_PUBLIC_KEY?.startsWith("TEST-")) {
    return NextResponse.json({ error: "NOT_AVAILABLE" }, { status: 403 });
  }

  const service = createServiceClient();
  const { error } = await (service as any)
    .from("orders")
    .update({ status: "paid", mp_status: "test_payment" })
    .eq("id", params.id)
    .eq("status", "pending");

  if (error) {
    return NextResponse.json({ error: "DB_ERROR" }, { status: 500 });
  }

  return NextResponse.json({ success: true });
}
