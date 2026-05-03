"use client";

import { useState } from "react";
import { ArrowLeft, Heart, Trash2 } from "lucide-react";
import { formatCLP } from "@/lib/format";
import { ORDER_STATUS_LABELS } from "@/lib/constants";
import type { Order, OrderItem, OrderStatus } from "@/lib/supabase/types";

type ScannedOrder = {
  order: Order;
  items: OrderItem[];
};

export default function OrderView({
  data,
  error,
  transitioning,
  onTransition,
  onBack,
}: {
  data: ScannedOrder;
  error?: string;
  transitioning?: boolean;
  onTransition: (orderId: string, action: string) => void;
  onBack: () => void;
}) {
  const { order, items } = data;
  const [confirmCancel, setConfirmCancel] = useState(false);

  const canDeliver = ["preparing", "ready"].includes(order.status);
  const canCancel = ["paid", "preparing", "ready"].includes(order.status);

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

        {(order as any).tip_clp > 0 && (
          <div className="flex justify-between items-center px-1 pt-1">
            <span className="text-zinc-400 flex items-center gap-1.5">
              <Heart className="w-3.5 h-3.5 text-trago-orange" /> Propina
            </span>
            <span className="text-trago-orange font-semibold tabular-nums">{formatCLP((order as any).tip_clp)}</span>
          </div>
        )}
        <div className="flex justify-between items-center px-1 pt-2">
          <span className="text-zinc-400">Total</span>
          <span className="text-white font-bold tabular-nums">
            {formatCLP(order.total_clp + ((order as any).tip_clp ?? 0))}
          </span>
        </div>
      </div>

      {/* Action buttons */}
      <div className="px-4 pb-8 pt-2 flex-shrink-0 space-y-2">
        {error && (
          <p className="text-red-400 text-sm text-center">{error}</p>
        )}

        {canDeliver && (
          <button
            onClick={() => onTransition(order.id, "deliver")}
            disabled={transitioning}
            className="w-full h-16 bg-trago-green text-white font-bold text-lg rounded-2xl touch-manipulation press-scale disabled:opacity-50"
          >
            {transitioning ? "Actualizando…" : "Entregado"}
          </button>
        )}

        {canCancel && (
          confirmCancel ? (
            <div className="flex gap-2">
              <button
                onClick={() => setConfirmCancel(false)}
                className="flex-1 h-11 bg-trago-card border border-trago-border text-zinc-300 font-medium rounded-xl touch-manipulation"
              >
                No cancelar
              </button>
              <button
                onClick={() => { setConfirmCancel(false); onTransition(order.id, "cancel"); }}
                disabled={transitioning}
                className="flex-1 h-11 bg-red-600 text-white font-semibold rounded-xl touch-manipulation press-scale disabled:opacity-50"
              >
                Confirmar cancelación
              </button>
            </div>
          ) : (
            <button
              onClick={() => setConfirmCancel(true)}
              disabled={transitioning}
              className="w-full h-11 flex items-center justify-center gap-2 text-red-400 font-medium text-sm rounded-xl hover:bg-red-500/10 transition-colors touch-manipulation disabled:opacity-40"
            >
              <Trash2 className="w-4 h-4" /> Cancelar pedido
            </button>
          )
        )}
      </div>
    </div>
  );
}
