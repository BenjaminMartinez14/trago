"use client";

import { ArrowLeft } from "lucide-react";
import { formatCLP } from "@/lib/format";
import { ORDER_STATUS_LABELS, STAFF_STATUS_TRANSITIONS, SCANNER_DELIVER } from "@/lib/constants";
import type { Order, OrderItem, OrderStatus } from "@/lib/supabase/types";

type ScannedOrder = {
  order: Order;
  items: OrderItem[];
};

export default function OrderView({
  data,
  error,
  transitioning,
  scannerMode,
  onTransition,
  onBack,
}: {
  data: ScannedOrder;
  error?: string;
  transitioning?: boolean;
  scannerMode?: boolean;
  onTransition: (orderId: string, action: string) => void;
  onBack: () => void;
}) {
  const { order, items } = data;
  // In scanner mode: if order is ready, deliver; otherwise use normal queue transitions
  const transition = scannerMode && order.status === "ready"
    ? SCANNER_DELIVER
    : STAFF_STATUS_TRANSITIONS[order.status];

  return (
    <div className="flex-1 flex flex-col overflow-hidden">
      {/* Back + order number */}
      <div className="px-4 pt-4 pb-2 flex items-center gap-3">
        <button
          onClick={onBack}
          className="w-10 h-10 flex items-center justify-center text-white touch-manipulation rounded-xl hover:bg-white/5 transition-colors -ml-1"
          aria-label="Volver"
        >
          <ArrowLeft className="w-5 h-5" />
        </button>
        <div>
          <p className="text-white font-display text-xl">Pedido #{order.order_number}</p>
          <p className="text-trago-muted text-xs capitalize">
            {ORDER_STATUS_LABELS[order.status as OrderStatus]}
          </p>
        </div>
      </div>

      {/* Items list */}
      <div className="flex-1 overflow-y-auto px-4 pb-4 space-y-2">
        {items.map((item) => (
          <div
            key={item.id}
            className="flex justify-between items-center bg-trago-card rounded-xl px-4 py-3 border border-trago-border"
          >
            <div>
              <p className="text-white font-medium">{item.product_name}</p>
              {item.notes && (
                <p className="text-zinc-400 text-xs mt-0.5">{item.notes}</p>
              )}
            </div>
            <div className="text-right">
              <p className="text-white font-bold">×{item.quantity}</p>
              <p className="text-zinc-400 text-xs tabular-nums">
                {formatCLP(item.unit_price_clp * item.quantity)}
              </p>
            </div>
          </div>
        ))}

        {order.notes && (
          <div className="bg-trago-card rounded-xl px-4 py-3 border border-trago-border">
            <p className="text-trago-muted text-xs mb-1">Nota del pedido</p>
            <p className="text-white text-sm">{order.notes}</p>
          </div>
        )}

        <div className="flex justify-between items-center px-1 pt-2">
          <span className="text-zinc-400">Total</span>
          <span className="text-white font-bold tabular-nums">{formatCLP(order.total_clp)}</span>
        </div>
      </div>

      {/* Action button */}
      <div className="px-4 pb-8 pt-2 flex-shrink-0">
        {error && (
          <p className="text-red-400 text-sm text-center mb-3">{error}</p>
        )}
        {scannerMode && order.status !== "ready" && order.status !== "delivered" ? (
          <div className="w-full h-14 bg-trago-card rounded-2xl flex items-center justify-center border border-yellow-500/30">
            <p className="text-yellow-400 text-sm font-medium">
              Pedido aún no está listo ({ORDER_STATUS_LABELS[order.status as OrderStatus]})
            </p>
          </div>
        ) : transition ? (
          <button
            onClick={() => onTransition(order.id, transition.action)}
            disabled={transitioning}
            className={`w-full h-16 ${transition.color} text-white font-bold text-lg rounded-2xl touch-manipulation press-scale disabled:opacity-50`}
          >
            {transitioning ? "Actualizando…" : transition.label}
          </button>
        ) : (
          <div className="w-full h-14 bg-trago-card rounded-2xl flex items-center justify-center border border-trago-border">
            <p className="text-trago-muted text-sm">
              Estado: {ORDER_STATUS_LABELS[order.status as OrderStatus]}
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
