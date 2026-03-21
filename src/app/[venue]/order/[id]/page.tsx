"use client";

import { useParams } from "next/navigation";
import { QRCodeCanvas } from "qrcode.react";
import { useOrderStatus } from "@/hooks/useOrderStatus";
import type { OrderStatus } from "@/lib/supabase/types";
import { ORDER_STATUS_LABELS } from "@/lib/constants";

const STATUS_COLOR: Record<OrderStatus, string> = {
  pending:   "text-zinc-400",
  paid:      "text-yellow-400",
  preparing: "text-blue-400",
  ready:     "text-green-400",
  delivered: "text-green-500",
  cancelled: "text-red-400",
};

const STATUS_ICON: Record<OrderStatus, string> = {
  pending:   "⏳",
  paid:      "✅",
  preparing: "🍹",
  ready:     "🔔",
  delivered: "🎉",
  cancelled: "❌",
};

export default function OrderConfirmationPage() {
  const params = useParams<{ venue: string; id: string }>();
  const { status, orderNumber, loading } = useOrderStatus(params.id);

  return (
    <div className="min-h-screen bg-black flex flex-col items-center px-4 py-10 gap-8">
      {/* Header */}
      <div className="text-center">
        <p className="text-zinc-400 text-sm uppercase tracking-widest mb-1">Pedido</p>
        {loading || orderNumber === null ? (
          <div className="w-20 h-10 bg-zinc-800 rounded-lg animate-pulse mx-auto" />
        ) : (
          <p className="text-white font-bold text-5xl tabular-nums">#{orderNumber}</p>
        )}
      </div>

      {/* Status badge */}
      {status && (
        <div className="flex items-center gap-2 bg-zinc-900 rounded-full px-5 py-2.5">
          <span className="text-lg" aria-hidden>{STATUS_ICON[status]}</span>
          <span className={`font-semibold text-base ${STATUS_COLOR[status]}`}>
            {ORDER_STATUS_LABELS[status]}
          </span>
        </div>
      )}

      {/* QR code — encodes the order UUID for staff scanner */}
      <div className="bg-white rounded-3xl p-5 shadow-2xl">
        <QRCodeCanvas
          value={params.id}
          size={220}
          level="M"
          includeMargin={false}
          bgColor="#ffffff"
          fgColor="#000000"
        />
      </div>

      {/* Instructions */}
      <div className="text-center max-w-xs">
        {status === "delivered" ? (
          <p className="text-green-400 font-semibold text-base">¡Que lo disfrutes! 🎉</p>
        ) : status === "cancelled" ? (
          <p className="text-red-400 text-base">Tu pedido fue cancelado.</p>
        ) : (
          <>
            <p className="text-white font-semibold text-base mb-1">
              Muestra este QR en la barra
            </p>
            <p className="text-zinc-400 text-sm">
              El barman escaneará tu código para preparar y entregarte tu pedido.
            </p>
          </>
        )}
      </div>

      {/* Live indicator */}
      {status && !["delivered", "cancelled"].includes(status) && (
        <div className="flex items-center gap-2 text-zinc-500 text-xs">
          <span className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
          Actualizando en tiempo real
        </div>
      )}
    </div>
  );
}
