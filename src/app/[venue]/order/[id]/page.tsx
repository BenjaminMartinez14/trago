"use client";

import { useParams } from "next/navigation";
import { QRCodeCanvas } from "qrcode.react";
import { Clock, CreditCard, ChefHat, Bell, PartyPopper, Ban } from "lucide-react";
import { useOrderStatus } from "@/hooks/useOrderStatus";
import type { OrderStatus } from "@/lib/supabase/types";
import { ORDER_STATUS_LABELS } from "@/lib/constants";

const STATUS_COLOR: Record<OrderStatus, string> = {
  pending:   "text-zinc-400",
  paid:      "text-trago-orange",
  preparing: "text-trago-blue",
  ready:     "text-trago-green",
  delivered: "text-trago-green",
  cancelled: "text-red-400",
};

const STATUS_BG: Record<OrderStatus, string> = {
  pending:   "bg-zinc-400/10 border-zinc-400/20",
  paid:      "bg-trago-orange/10 border-trago-orange/20",
  preparing: "bg-trago-blue/10 border-trago-blue/20",
  ready:     "bg-trago-green/10 border-trago-green/20",
  delivered: "bg-trago-green/10 border-trago-green/20",
  cancelled: "bg-red-400/10 border-red-400/20",
};

const StatusIcon = ({ status }: { status: OrderStatus }) => {
  const className = "w-5 h-5";
  switch (status) {
    case "pending":   return <Clock className={className} />;
    case "paid":      return <CreditCard className={className} />;
    case "preparing": return <ChefHat className={className} />;
    case "ready":     return <Bell className={className} />;
    case "delivered": return <PartyPopper className={className} />;
    case "cancelled": return <Ban className={className} />;
  }
};

export default function OrderConfirmationPage() {
  const params = useParams<{ venue: string; id: string }>();
  const { status, orderNumber, loading } = useOrderStatus(params.id);

  return (
    <div className="min-h-screen bg-trago-black flex flex-col items-center px-4 py-10 gap-8">
      {/* Header */}
      <div className="text-center animate-fade-in">
        <p className="text-trago-muted text-sm uppercase tracking-widest mb-1 font-medium">Pedido</p>
        {loading || orderNumber === null ? (
          <div className="w-20 h-10 bg-trago-card rounded-lg animate-pulse mx-auto" />
        ) : (
          <p className="text-white font-display text-5xl tabular-nums text-glow-orange">#{orderNumber}</p>
        )}
      </div>

      {/* Status badge */}
      {status && (
        <div className={`flex items-center gap-2 rounded-full px-5 py-2.5 border ${STATUS_BG[status]} animate-fade-in`}>
          <span className={STATUS_COLOR[status]}>
            <StatusIcon status={status} />
          </span>
          <span className={`font-semibold text-base ${STATUS_COLOR[status]}`}>
            {ORDER_STATUS_LABELS[status]}
          </span>
        </div>
      )}

      {/* QR code — encodes the order UUID for staff scanner */}
      <div className="bg-white rounded-3xl p-5 shadow-2xl animate-slide-up">
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
      <div className="text-center max-w-xs animate-fade-in">
        {status === "delivered" ? (
          <div className="flex flex-col items-center gap-2">
            <PartyPopper className="w-8 h-8 text-trago-green" />
            <p className="text-trago-green font-semibold text-base">¡Que lo disfrutes!</p>
          </div>
        ) : status === "cancelled" ? (
          <p className="text-red-400 text-base">Tu pedido fue cancelado.</p>
        ) : (
          <>
            <p className="text-white font-semibold text-base mb-1">
              Muestra este QR en la barra
            </p>
            <p className="text-trago-muted text-sm">
              El barman escaneará tu código para preparar y entregarte tu pedido.
            </p>
          </>
        )}
      </div>

      {/* Live indicator */}
      {status && !["delivered", "cancelled"].includes(status) && (
        <div className="flex items-center gap-2 text-trago-muted text-xs">
          <span className="w-2 h-2 bg-trago-green rounded-full animate-pulse-glow" />
          Actualizando en tiempo real
        </div>
      )}
    </div>
  );
}
