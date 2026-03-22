"use client";

import { useEffect, useState } from "react";
import { ShoppingBag } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { formatCLP } from "@/lib/format";
import type { Order } from "@/lib/supabase/types";
import { ORDER_STATUS_LABELS } from "@/lib/constants";

export default function DashboardOrdersPage() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const supabase = createClient();

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    async function fetchOrders() {
      const { data } = await supabase
        .from("orders")
        .select("*")
        .gte("created_at", today.toISOString())
        .order("created_at", { ascending: false });

      setOrders((data ?? []) as Order[]);
      setLoading(false);
    }

    fetchOrders();

    const channel = supabase
      .channel("dashboard-orders")
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "orders" },
        (payload) => {
          const newOrder = payload.new as Order;
          setOrders((prev) => [newOrder, ...prev]);
        }
      )
      .on(
        "postgres_changes",
        { event: "UPDATE", schema: "public", table: "orders" },
        (payload) => {
          const updated = payload.new as Order;
          setOrders((prev) =>
            prev.map((o) => (o.id === updated.id ? updated : o))
          );
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const statusColor: Record<string, string> = {
    pending: "text-zinc-400 bg-zinc-400/10",
    paid: "text-trago-blue bg-trago-blue/10",
    preparing: "text-trago-orange bg-trago-orange/10",
    ready: "text-trago-green bg-trago-green/10",
    delivered: "text-zinc-500 bg-zinc-500/10",
    cancelled: "text-red-400 bg-red-400/10",
  };

  return (
    <div className="max-w-5xl">
      <h1 className="text-2xl font-display mb-6">Pedidos de hoy</h1>

      {loading ? (
        <div className="space-y-3">
          {[0, 1, 2, 3].map((i) => (
            <div key={i} className="bg-trago-card rounded-xl h-14 animate-pulse border border-trago-border" />
          ))}
        </div>
      ) : orders.length === 0 ? (
        <div className="bg-trago-card border border-trago-border rounded-xl p-12 text-center">
          <ShoppingBag className="w-10 h-10 text-zinc-600 mx-auto mb-3" />
          <p className="text-trago-muted">No hay pedidos hoy aún.</p>
        </div>
      ) : (
        <div className="bg-trago-card border border-trago-border rounded-xl overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-trago-border">
                <th className="text-left px-4 py-3 text-trago-muted font-medium">#</th>
                <th className="text-left px-4 py-3 text-trago-muted font-medium">Estado</th>
                <th className="text-left px-4 py-3 text-trago-muted font-medium">Total</th>
                <th className="text-left px-4 py-3 text-trago-muted font-medium">Notas</th>
                <th className="text-left px-4 py-3 text-trago-muted font-medium">Hora</th>
              </tr>
            </thead>
            <tbody>
              {orders.map((order) => (
                <tr
                  key={order.id}
                  className="border-b border-trago-border last:border-0 hover:bg-white/[0.02] transition-colors"
                >
                  <td className="px-4 py-3 font-mono text-zinc-300 tabular-nums">
                    #{order.order_number}
                  </td>
                  <td className="px-4 py-3">
                    <span
                      className={`font-medium text-xs px-2.5 py-1 rounded-full ${statusColor[order.status] ?? "text-zinc-400 bg-zinc-400/10"}`}
                    >
                      {ORDER_STATUS_LABELS[order.status] ?? order.status}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-white font-medium tabular-nums">
                    {formatCLP(order.total_clp)}
                  </td>
                  <td className="px-4 py-3 text-trago-muted max-w-xs truncate">
                    {order.notes ?? "—"}
                  </td>
                  <td className="px-4 py-3 text-zinc-500 tabular-nums">
                    {new Date(order.created_at).toLocaleTimeString("es-CL", {
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
