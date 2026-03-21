import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createServiceClient } from "@/lib/supabase/server";
import type { Order, OrderItem, Product } from "@/lib/supabase/types";

export async function GET() {
  // Auth check
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "UNAUTHORIZED" }, { status: 401 });
  }

  const service = createServiceClient();

  // Today's date range (UTC)
  const today = new Date();
  today.setUTCHours(0, 0, 0, 0);
  const todayStart = today.toISOString();

  // Fetch today's paid/delivered orders
  const { data: ordersRaw } = await service
    .from("orders")
    .select("*")
    .in("status", ["paid", "preparing", "ready", "delivered"])
    .gte("created_at", todayStart);

  const orders = (ordersRaw ?? []) as Order[];

  const revenue = orders.reduce((sum, o) => sum + o.total_clp, 0);
  const orderCount = orders.length;

  // Top 3 products by quantity sold today
  let topProducts: { name: string; quantity: number }[] = [];

  if (orders.length > 0) {
    const orderIds = orders.map((o) => o.id);
    const { data: itemsRaw } = await service
      .from("order_items")
      .select("product_id, product_name, quantity")
      .in("order_id", orderIds);

    const items = (itemsRaw ?? []) as Pick<
      OrderItem,
      "product_id" | "product_name" | "quantity"
    >[];

    const totals: Record<string, { name: string; quantity: number }> = {};
    for (const item of items) {
      if (!totals[item.product_id]) {
        totals[item.product_id] = { name: item.product_name, quantity: 0 };
      }
      totals[item.product_id].quantity += item.quantity;
    }

    topProducts = Object.values(totals)
      .sort((a, b) => b.quantity - a.quantity)
      .slice(0, 3);
  }

  return NextResponse.json({ revenue, orderCount, topProducts });
}
