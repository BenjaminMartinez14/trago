"use client";

import { useEffect, useState } from "react";
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
    pending: "text-zinc-400",
    paid: "text-blue-400",
    preparing: "text-amber-400",
    ready: "text-green-400",
    delivered: "text-zinc-500",
    cancelled: "text-red-400",
  };

  return (
    <div className="max-w-5xl">
      <h1 className="text-2xl font-bold mb-6">Pedidos de hoy</h1>

      {loading ? (
        <div className="space-y-3">
          {[0, 1, 2, 3].map((i) => (
            <div key={i} className="bg-zinc-900 rounded-xl h-14 animate-pulse" />
          ))}
        </div>
      ) : orders.length === 0 ? (
        <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-12 text-center">
          <p className="text-zinc-500">No hay pedidos hoy aún.</p>
        </div>
      ) : (
        <div className="bg-zinc-900 border border-zinc-800 rounded-xl overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-zinc-800">
                <th className="text-left px-4 py-3 text-zinc-400 font-medium">#</th>
                <th className="text-left px-4 py-3 text-zinc-400 font-medium">Estado</th>
                <th className="text-left px-4 py-3 text-zinc-400 font-medium">Total</th>
                <th className="text-left px-4 py-3 text-zinc-400 font-medium">Notas</th>
                <th className="text-left px-4 py-3 text-zinc-400 font-medium">Hora</th>
              </tr>
            </thead>
            <tbody>
              {orders.map((order) => (
                <tr
                  key={order.id}
                  className="border-b border-zinc-800/50 last:border-0"
                >
                  <td className="px-4 py-3 font-mono text-zinc-300">
                    #{order.order_number}
                  </td>
                  <td className="px-4 py-3">
                    <span
                      className={`font-medium ${statusColor[order.status] ?? "text-zinc-400"}`}
                    >
                      {ORDER_STATUS_LABELS[order.status] ?? order.status}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-white font-medium">
                    {formatCLP(order.total_clp)}
                  </td>
                  <td className="px-4 py-3 text-zinc-400 max-w-xs truncate">
                    {order.notes ?? "—"}
                  </td>
                  <td className="px-4 py-3 text-zinc-500">
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
