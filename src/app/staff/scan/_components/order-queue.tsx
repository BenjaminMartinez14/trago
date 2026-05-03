"use client";

import { useState, useEffect, useCallback } from "react";
import { Loader2, Heart, ScanLine } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { formatCLP } from "@/lib/format";
import type { Order, OrderItem } from "@/lib/supabase/types";

type OrderWithItems = Order & { order_items: OrderItem[] };

function timeAgo(dateStr: string): string {
  const diff = Math.floor((Date.now() - new Date(dateStr).getTime()) / 1000);
  if (diff < 60) return `${diff}s`;
  if (diff < 3600) return `${Math.floor(diff / 60)}m`;
  return `${Math.floor(diff / 3600)}h`;
}

const SECTIONS: { status: string; title: string; accent: string; bg: string }[] = [
  { status: "preparing", title: "Preparando", accent: "text-yellow-400", bg: "border-yellow-500/30" },
  { status: "ready", title: "Listos", accent: "text-trago-green", bg: "border-trago-green/30" },
];

export default function OrderQueue({
  token,
  venueId,
  stationId,
  onOpenOrder,
  onScanQR,
}: {
  token: string;
  venueId: string;
  stationId: string | null;
  onOpenOrder: (orderId: string) => void;
  onScanQR: () => void;
}) {
  const [orders, setOrders] = useState<OrderWithItems[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchOrders = useCallback(() => {
    const base = stationId
      ? `/api/staff/orders?stationId=${stationId}&_t=${Date.now()}`
      : `/api/staff/orders?_t=${Date.now()}`;
    return fetch(base, {
      headers: { Authorization: `Bearer ${token}`, "Cache-Control": "no-cache" },
    })
      .then((r) => r.json())
      .then((d) => setOrders(d.orders ?? []));
  }, [token, stationId]);

  useEffect(() => {
    setLoading(true);
    fetchOrders().finally(() => setLoading(false));
  }, [fetchOrders]);

  useEffect(() => {
    const interval = setInterval(fetchOrders, 5_000);
    return () => clearInterval(interval);
  }, [fetchOrders]);

  useEffect(() => {
    const handleVisible = () => {
      if (document.visibilityState === "visible") fetchOrders();
    };
    document.addEventListener("visibilitychange", handleVisible);
    return () => document.removeEventListener("visibilitychange", handleVisible);
  }, [fetchOrders]);

  const fetchSingleOrder = useCallback(
    async (orderId: string) => {
      const res = await fetch(`/api/staff/orders/${orderId}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) return;
      const data = await res.json();
      const orderWithItems: OrderWithItems = {
        ...data.order,
        order_items: data.items,
      };
      setOrders((prev) => {
        if (prev.some((o) => o.id === orderId)) {
          return prev.map((o) => (o.id === orderId ? orderWithItems : o));
        }
        return [...prev, orderWithItems];
      });
    },
    [token]
  );

  useEffect(() => {
    const supabase = createClient();
    const channel = supabase
      .channel(`queue-${venueId}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "orders",
          filter: `venue_id=eq.${venueId}`,
        },
        (payload) => {
          const updated = payload.new as Order & { station_id?: string | null };
          if (!updated?.id) return;

          if (stationId && updated.station_id !== null && updated.station_id !== stationId) {
            setOrders((prev) => prev.filter((o) => o.id !== updated.id));
            return;
          }

          const activeStatuses = ["preparing", "ready"];

          if (activeStatuses.includes(updated.status)) {
            setOrders((prev) => {
              const exists = prev.find((o) => o.id === updated.id);
              if (exists) {
                return prev.map((o) => (o.id === updated.id ? { ...o, ...updated } : o));
              }
              fetchSingleOrder(updated.id);
              return prev;
            });
          } else if (updated.status === "delivered" || updated.status === "cancelled") {
            setOrders((prev) => prev.filter((o) => o.id !== updated.id));
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [venueId, stationId, fetchSingleOrder]);

  return (
    <div className="flex-1 flex flex-col overflow-hidden">
      {/* Order list */}
      <div className="flex-1 overflow-y-auto px-4 py-4 pb-24 space-y-6">
        {loading ? (
          <div className="flex-1 flex items-center justify-center pt-16">
            <Loader2 className="w-8 h-8 text-trago-orange animate-spin" />
          </div>
        ) : orders.length === 0 ? (
          <div className="flex flex-col items-center justify-center text-center px-6 gap-3 pt-16">
            <p className="text-zinc-500 text-lg">Sin pedidos activos</p>
            <p className="text-zinc-600 text-sm">Escanea el QR del cliente para empezar</p>
          </div>
        ) : (
          SECTIONS.map((section) => {
            const sectionOrders = orders.filter((o) => o.status === section.status);
            if (sectionOrders.length === 0) return null;

            return (
              <div key={section.status}>
                <p className={`text-xs font-semibold uppercase tracking-wide mb-2 ${section.accent}`}>
                  {section.title} ({sectionOrders.length})
                </p>
                <div className="space-y-2">
                  {sectionOrders.map((order) => (
                    <div
                      key={order.id}
                      className={`bg-trago-card border ${section.bg} rounded-xl p-3 cursor-pointer active:scale-[0.98] transition-transform`}
                      onClick={() => onOpenOrder(order.id)}
                    >
                      <div className="flex items-start justify-between">
                        <div>
                          <p className="text-white font-bold text-sm">
                            #{order.order_number}
                          </p>
                          <div className="mt-0.5 space-y-0.5">
                            {order.order_items?.map((i) => (
                              <p key={i.id} className="text-zinc-400 text-xs">
                                {i.product_name} ×{i.quantity}
                                {i.notes && (
                                  <span className="text-yellow-400 ml-1">— {i.notes}</span>
                                )}
                              </p>
                            ))}
                            {order.notes && (
                              <p className="text-yellow-400 text-xs mt-1">📝 {order.notes}</p>
                            )}
                          </div>
                        </div>
                        <div className="text-right shrink-0 ml-3">
                          <p className="text-white text-sm font-semibold tabular-nums">
                            {formatCLP(order.total_clp + ((order as any).tip_clp ?? 0))}
                          </p>
                          {(order as any).tip_clp > 0 && (
                            <p className="text-trago-orange text-xs flex items-center justify-end gap-0.5 mt-0.5">
                              <Heart className="w-3 h-3" />{formatCLP((order as any).tip_clp)}
                            </p>
                          )}
                          <p className="text-zinc-500 text-xs">{timeAgo(order.created_at)}</p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Floating scan button */}
      <div className="fixed bottom-0 left-0 right-0 px-4 pb-8 pt-3 bg-gradient-to-t from-trago-black via-trago-black/90 to-transparent pointer-events-none">
        <button
          onClick={onScanQR}
          className="w-full h-14 bg-trago-orange text-white font-bold text-base rounded-2xl touch-manipulation press-scale glow-orange-sm flex items-center justify-center gap-2 pointer-events-auto"
        >
          <ScanLine className="w-5 h-5" />
          Escanear QR
        </button>
      </div>
    </div>
  );
}
