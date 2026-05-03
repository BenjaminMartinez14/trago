import { NextResponse } from "next/server";
import { createClient, createServiceClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

function csvEscape(v: unknown): string {
  if (v === null || v === undefined) return "";
  const s = String(v);
  return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

export async function GET(request: Request) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "UNAUTHORIZED" }, { status: 401 });

  const { searchParams } = new URL(request.url);
  const fromStr = searchParams.get("from");
  const toStr   = searchParams.get("to");
  if (!fromStr || !toStr) return NextResponse.json({ error: "MISSING_RANGE" }, { status: 400 });

  const service = createServiceClient();
  const { data: orders } = await service
    .from("orders")
    .select("*")
    .gte("created_at", fromStr)
    .lte("created_at", toStr)
    .order("created_at", { ascending: true });

  const rows = orders ?? [];
  const header = ["order_number","status","total_clp","tip_clp","created_at","updated_at","station_id","mp_payment_id"];
  const lines = [header.join(",")];
  for (const o of rows as any[]) {
    lines.push([
      csvEscape(o.order_number),
      csvEscape(o.status),
      csvEscape(o.total_clp),
      csvEscape(o.tip_clp ?? 0),
      csvEscape(o.created_at),
      csvEscape(o.updated_at),
      csvEscape(o.station_id ?? ""),
      csvEscape(o.mp_payment_id ?? ""),
    ].join(","));
  }

  return new Response(lines.join("\n"), {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="trago-orders-${fromStr.slice(0,10)}-to-${toStr.slice(0,10)}.csv"`,
    },
  });
}
