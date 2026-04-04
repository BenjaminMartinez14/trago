import { useState, useEffect, useRef } from "react";
import { createClient } from "@/lib/supabase/client";
import type { OrderStatus } from "@/lib/supabase/types";
import { POLL_INTERVAL_MS } from "@/lib/constants";

type OrderStatusResult = {
  status: OrderStatus | null;
  orderNumber: number | null;
  loading: boolean;
};

export function useOrderStatus(orderId: string): OrderStatusResult {
  const [status, setStatus] = useState<OrderStatus | null>(null);
  const [orderNumber, setOrderNumber] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    if (!orderId) return;

    let cancelled = false;

    async function fetchStatus() {
      try {
        const res = await fetch(`/api/orders/${orderId}/status`);
        if (res.ok && !cancelled) {
          const data = await res.json();
          setStatus(data.status);
          setOrderNumber(data.orderNumber);
          setLoading(false);
          // Stop polling once order reaches a terminal state
          if (["delivered", "cancelled"].includes(data.status)) {
            if (pollRef.current) clearInterval(pollRef.current);
          }
        }
      } catch {
        // Network error — keep polling
      }
    }

    // Initial fetch
    fetchStatus();

    // Polling fallback every 3s
    pollRef.current = setInterval(fetchStatus, POLL_INTERVAL_MS);

    // Realtime subscription (best-effort — falls back to polling if RLS blocks)
    const supabase = createClient();
    const channel = supabase
      .channel(`order-status-${orderId}`)
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "orders",
          filter: `id=eq.${orderId}`,
        },
        (payload) => {
          if (!cancelled) {
            const newStatus = (payload.new as { status: OrderStatus }).status;
            setStatus(newStatus);
            setLoading(false);
            if (["delivered", "cancelled"].includes(newStatus)) {
              if (pollRef.current) clearInterval(pollRef.current);
            }
          }
        }
      )
      .subscribe();

    return () => {
      cancelled = true;
      if (pollRef.current) clearInterval(pollRef.current);
      supabase.removeChannel(channel);
    };
  }, [orderId]);

  return { status, orderNumber, loading };
}
