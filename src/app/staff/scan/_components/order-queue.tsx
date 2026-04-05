"use client";

import { useState, useEffect, useCallback } from "react";
import { Loader2 } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { formatCLP } from "@/lib/format";
import { STAFF_STATUS_TRANSITIONS } from "@/lib/constants";
import type { Order, OrderItem } from "@/lib/supabase/types";

type OrderWithItems = Order & { order_items: OrderItem[] };

function playBeep() {
  try {
    const ctx = new AudioContext();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.frequency.value = 880;
    gain.gain.setValueAtTime(0.3, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.4);
    osc.start();
    osc.stop(ctx.currentTime + 0.4);
  } catch {
    // AudioContext blocked
  }
}

function timeAgo(dateStr: string): string {
  const diff = Math.floor((Date.now() - new Date(dateStr).getTime()) / 1000);
  if (diff < 60) return `${diff}s`;
  if (diff < 3600) return `${Math.floor(diff / 60)}m`;
  return `${Math.floor(diff / 3600)}h`;
}

const SECTIONS: { status: string; title: string; accent: string; bg: string }[] = [
  { status: "paid", title: "Pagados", accent: "text-trago-orange", bg: "border-trago-orange/30" },
  { status: "preparing", title: "Preparando", accent: "text-yellow-400", bg: "border-yellow-500/30" },
  { status: "ready", title: "Listos", accent: "text-trago-green", bg: "border-trago-green/30" },
];

export default function OrderQueue({
  token,
  venueId,
  stationId,
  onOpenOrder,
}: {
  token: string;
  venueId: string;
  stationId: string | null;
  onOpenOrder: (orderId: string) => void;
}) {
  const [orders, setOrders] = useState<OrderWithItems[]>([]);
  const [loading, setLoading] = useState(true);
  const [transitioning, setTransitioning] = useState<string | null>(null);

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

  // Fetch initial orders (re-fetch when stationId changes)
  useEffect(() => {
    setLoading(true);
    fetchOrders().finally(() => setLoading(false));
  }, [fetchOrders]);

  // Polling fallback — ensures orders appear even when realtime drops
  useEffect(() => {
    const interval = setInterval(fetchOrders, 5_000);
    return () => clearInterval(interval);
  }, [fetchOrders]);

  // Re-fetch immediately when tab becomes visible (mobile staff switch apps often)
  useEffect(() => {
    const handleVisible = () => {
      if (document.visibilityState === "visible") fetchOrders();
    };
    document.addEventListener("visibilitychange", handleVisible);
    return () => document.removeEventListener("visibilitychange", handleVisible);
  }, [fetchOrders]);

  // Realtime subscription
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

          // If a station filter is active, ignore orders from other stations (but keep unassigned ones)
          if (stationId && updated.station_id !== null && updated.station_id !== stationId) {
            setOrders((prev) => prev.filter((o) => o.id !== updated.id));
            return;
          }

          const activeStatuses = ["paid", "preparing", "ready"];

          if (activeStatuses.includes(updated.status)) {
            // Add or update
            setOrders((prev) => {
              const exists = prev.find((o) => o.id === updated.id);
              if (exists) {
                return prev.map((o) => (o.id === updated.id ? { ...o, ...updated } : o));
              }
              // New order — beep
              if (updated.status === "paid") playBeep();
              // We don't have items from realtime, fetch them
              fetchSingleOrder(updated.id);
              return prev;
            });
          } else {
            // Remove (delivered/cancelled)
            setOrders((prev) => prev.filter((o) => o.id !== updated.id));
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [venueId, stationId, fetchSingleOrder]);

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

  async function handleTransition(orderId: string, action: string) {
    setTransitioning(orderId);
    const res = await fetch(`/api/staff/orders/${orderId}/transition`, {
      method: "PATCH",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ action }),
    });

    if (res.ok) {
      const { newStatus } = await res.json();
      setOrders((prev) =>
        prev.map((o) => (o.id === orderId ? { ...o, status: newStatus } : o))
      );
      // Force a fresh fetch to replace any stale data the poll might return
      fetchOrders();
    }
    setTransitioning(null);
  }

  if (loading) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <Loader2 className="w-8 h-8 text-trago-orange animate-spin" />
      </div>
    );
  }

  if (orders.length === 0) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center text-center px-6 gap-3">
        <p className="text-zinc-500 text-lg">Sin pedidos activos</p>
        <p className="text-zinc-600 text-sm">Los nuevos pedidos aparecerán aquí automáticamente</p>
      </div>
    );
  }

  return (
    <div className="flex-1 overflow-y-auto px-4 py-4 space-y-6">
      {SECTIONS.map((section) => {
        const sectionOrders = orders.filter((o) => o.status === section.status);
        if (sectionOrders.length === 0) return null;

        const transition = STAFF_STATUS_TRANSITIONS[section.status];

        return (
          <div key={section.status}>
            <p className={`text-xs font-semibold uppercase tracking-wide mb-2 ${section.accent}`}>
              {section.title} ({sectionOrders.length})
            </p>
            <div className="space-y-2">
              {sectionOrders.map((order) => (
                <div
                  key={order.id}
                  className={`bg-trago-card border ${section.bg} rounded-xl p-3`}
                >
                  <div
                    className="flex items-start justify-between mb-2 cursor-pointer"
                    onClick={() => onOpenOrder(order.id)}
                  >
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
                        {formatCLP(order.total_clp)}
                      </p>
                      <p className="text-zinc-500 text-xs">{timeAgo(order.created_at)}</p>
                    </div>
                  </div>
                  {transition && (
                    <button
                      onClick={() => handleTransition(order.id, transition.action)}
                      disabled={transitioning === order.id}
                      className={`w-full h-10 ${transition.color} text-white font-semibold text-sm rounded-xl touch-manipulation press-scale disabled:opacity-50`}
                    >
                      {transitioning === order.id ? "…" : transition.label}
                    </button>
                  )}
                </div>
              ))}
            </div>
          </div>
        );
      })}
    </div>
  );
}
