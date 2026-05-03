"use client";

import { useEffect, useState } from "react";
import { ShoppingBag, CheckCircle2, Clock, Ban, TrendingUp, AlertCircle } from "lucide-react";
import { toast } from "sonner";
import { createClient } from "@/lib/supabase/client";
import { formatCLP } from "@/lib/format";
import type { Order } from "@/lib/supabase/types";
import { ORDER_STATUS_LABELS } from "@/lib/constants";

// ── Section definitions ───────────────────────────────────────────────────────

const SECTIONS = [
  {
    key: "active",
    statuses: ["paid", "preparing", "ready"],
    label: "En curso",
    description: "Pedidos pagados que aún no fueron entregados",
    icon: Clock,
    accent: "text-trago-orange",
    border: "border-trago-orange/30",
    bg: "bg-trago-orange/5",
    dot: "bg-trago-orange animate-pulse",
  },
  {
    key: "delivered",
    statuses: ["delivered"],
    label: "Entregados",
    description: "Ventas completadas",
    icon: CheckCircle2,
    accent: "text-trago-green",
    border: "border-trago-green/30",
    bg: "bg-trago-green/5",
    dot: "bg-trago-green",
  },
  {
    key: "abandoned",
    statuses: ["paid", "preparing", "ready"],
    label: "Pagados sin entregar",
    description: "Pagaron pero el pedido nunca llegó a entregado — requiere atención",
    icon: AlertCircle,
    accent: "text-yellow-400",
    border: "border-yellow-500/30",
    bg: "bg-yellow-500/5",
    dot: "bg-yellow-400",
    abandonedOnly: true, // shown separately at top as a warning
  },
  {
    key: "cancelled",
    statuses: ["cancelled"],
    label: "Cancelados",
    description: "Pedidos cancelados",
    icon: Ban,
    accent: "text-red-400",
    border: "border-red-500/20",
    bg: "bg-red-500/5",
    dot: "bg-red-400",
  },
  {
    key: "pending",
    statuses: ["pending"],
    label: "Sin pagar",
    description: "Iniciados pero sin pago confirmado",
    icon: ShoppingBag,
    accent: "text-zinc-500",
    border: "border-zinc-700",
    bg: "",
    dot: "bg-zinc-500",
  },
] as const;

function timeStr(dateStr: string) {
  return new Date(dateStr).toLocaleTimeString("es-CL", {
    hour: "2-digit",
    minute: "2-digit",
  });
}

const STATUS_BADGE: Record<string, string> = {
  pending:   "text-zinc-400 bg-zinc-400/10",
  paid:      "text-trago-blue bg-trago-blue/10",
  preparing: "text-trago-orange bg-trago-orange/10",
  ready:     "text-trago-green bg-trago-green/10",
  delivered: "text-trago-green bg-trago-green/10",
  cancelled: "text-red-400 bg-red-400/10",
  refunded:  "text-purple-300 bg-purple-500/10",
};

// ── Order row ─────────────────────────────────────────────────────────────────

function OrderRow({ order, showStatus, onRefunded }: { order: Order; showStatus?: boolean; onRefunded?: () => void }) {
  const [confirming, setConfirming] = useState(false);
  const [refunding, setRefunding] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const tip = (order as any).tip_clp ?? 0;
  const grand = order.total_clp + tip;
  const canRefund = order.mp_payment_id && order.status !== "refunded" && ["paid","preparing","ready","delivered","cancelled"].includes(order.status);

  async function doRefund() {
    setRefunding(true);
    setError(null);
    try {
      const res = await fetch(`/api/dashboard/orders/${order.id}/refund`, { method: "POST" });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        setError(body.error ?? "Error");
        toast.error("No se pudo reembolsar el pedido");
        return;
      }
      toast.success(`Pedido #${order.order_number} reembolsado`);
      onRefunded?.();
    } finally {
      setRefunding(false);
      setConfirming(false);
    }
  }

  return (
    <div className="px-4 py-3 border-b border-trago-border last:border-0 hover:bg-white/[0.02] transition-colors">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3 min-w-0">
          <span className="font-mono text-zinc-400 text-sm tabular-nums flex-shrink-0">
            #{order.order_number}
          </span>
          {showStatus && (
            <span className={`text-xs px-2 py-0.5 rounded-full font-medium flex-shrink-0 ${STATUS_BADGE[order.status] ?? "text-zinc-400 bg-zinc-400/10"}`}>
              {ORDER_STATUS_LABELS[order.status] ?? order.status}
            </span>
          )}
          {order.notes && (
            <span className="text-zinc-500 text-xs truncate">{order.notes}</span>
          )}
        </div>
        <div className="flex items-center gap-3 flex-shrink-0 ml-3">
          {canRefund && !confirming && (
            <button
              onClick={() => setConfirming(true)}
              className="text-purple-300 text-xs hover:text-purple-200 transition-colors"
            >
              Reembolsar
            </button>
          )}
          <div className="text-right">
            <p className="text-white font-semibold tabular-nums text-sm">{formatCLP(grand)}</p>
            {tip > 0 && (
              <p className="text-trago-orange text-xs tabular-nums">+{formatCLP(tip)} prop.</p>
            )}
          </div>
          <span className="text-zinc-600 text-xs tabular-nums w-10 text-right">
            {timeStr(order.created_at)}
          </span>
        </div>
      </div>

      {confirming && (
        <div className="mt-2 flex items-center justify-end gap-2">
          {error && <span className="text-red-400 text-xs mr-auto">{error}</span>}
          <button onClick={() => { setConfirming(false); setError(null); }} className="text-zinc-400 text-xs hover:text-white">Cancelar</button>
          <button
            onClick={doRefund}
            disabled={refunding}
            className="text-xs px-3 py-1 bg-purple-500/20 text-purple-200 rounded-md font-semibold disabled:opacity-50"
          >
            {refunding ? "Procesando…" : "Confirmar reembolso"}
          </button>
        </div>
      )}
    </div>
  );
}

// ── Section block ─────────────────────────────────────────────────────────────

function Section({
  label,
  description,
  accent,
  border,
  bg,
  dot,
  Icon,
  orders,
  showStatus,
  onRefunded,
}: {
  label: string;
  description: string;
  accent: string;
  border: string;
  bg: string;
  dot: string;
  Icon: React.ElementType;
  orders: Order[];
  showStatus?: boolean;
  onRefunded?: () => void;
}) {
  if (orders.length === 0) return null;

  const total = orders.reduce((s, o) => s + o.total_clp + ((o as any).tip_clp ?? 0), 0);

  return (
    <div className={`rounded-2xl border ${border} ${bg} overflow-hidden`}>
      <div className="flex items-center justify-between px-4 py-3 border-b border-inherit">
        <div className="flex items-center gap-2.5">
          <span className={`w-2 h-2 rounded-full flex-shrink-0 ${dot}`} />
          <Icon className={`w-4 h-4 ${accent}`} />
          <span className={`font-semibold text-sm ${accent}`}>
            {label}
          </span>
          <span className="text-zinc-600 text-xs">({orders.length})</span>
        </div>
        <div className="text-right">
          <p className="text-white font-bold tabular-nums text-sm">{formatCLP(total)}</p>
          <p className="text-zinc-600 text-xs">{description}</p>
        </div>
      </div>
      <div className="bg-trago-card">
        {orders.map((order) => (
          <OrderRow key={order.id} order={order} showStatus={showStatus} onRefunded={onRefunded} />
        ))}
      </div>
    </div>
  );
}

// ── Main page ─────────────────────────────────────────────────────────────────

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
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "orders" },
        (payload) => setOrders((prev) => [payload.new as Order, ...prev])
      )
      .on("postgres_changes", { event: "UPDATE", schema: "public", table: "orders" },
        (payload) => {
          const updated = payload.new as Order;
          setOrders((prev) => prev.map((o) => (o.id === updated.id ? updated : o)));
        }
      )
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, []);

  // ── Grouping ───────────────────────────────────────────────────────────────

  const delivered  = orders.filter((o) => o.status === "delivered");
  const active     = orders.filter((o) => ["paid", "preparing", "ready"].includes(o.status));
  const cancelled  = orders.filter((o) => o.status === "cancelled");
  const pending    = orders.filter((o) => o.status === "pending");

  // "Paid but never delivered" = paid + cancelled orders that were once paid
  // We detect these as cancelled orders that have an mp_payment_id (meaning payment went through)
  const paidNeverDelivered = cancelled.filter((o) => o.mp_payment_id);

  // Summary numbers
  const totalDelivered   = delivered.reduce((s, o) => s + o.total_clp, 0);
  const totalActive      = active.reduce((s, o) => s + o.total_clp, 0);
  const totalLost        = paidNeverDelivered.reduce((s, o) => s + o.total_clp, 0);

  return (
    <div className="max-w-3xl space-y-6">
      <h1 className="text-2xl font-display">Pedidos de hoy</h1>

      {loading ? (
        <div className="space-y-3">
          {[0, 1, 2].map((i) => (
            <div key={i} className="bg-trago-card rounded-xl h-20 animate-pulse border border-trago-border" />
          ))}
        </div>
      ) : orders.length === 0 ? (
        <div className="bg-trago-card border border-trago-border rounded-xl p-12 text-center">
          <ShoppingBag className="w-10 h-10 text-zinc-600 mx-auto mb-3" />
          <p className="text-trago-muted">No hay pedidos hoy aún.</p>
        </div>
      ) : (
        <>
          {/* ── Summary cards ── */}
          <div className="grid grid-cols-3 gap-3">
            <div className="bg-trago-card border border-trago-green/20 rounded-2xl px-4 py-3">
              <p className="text-trago-muted text-xs mb-1 flex items-center gap-1.5">
                <TrendingUp className="w-3.5 h-3.5 text-trago-green" />
                Vendido
              </p>
              <p className="text-white font-bold tabular-nums">{formatCLP(totalDelivered)}</p>
              <p className="text-zinc-600 text-xs">{delivered.length} entregados</p>
            </div>
            <div className="bg-trago-card border border-trago-orange/20 rounded-2xl px-4 py-3">
              <p className="text-trago-muted text-xs mb-1 flex items-center gap-1.5">
                <Clock className="w-3.5 h-3.5 text-trago-orange" />
                En curso
              </p>
              <p className="text-white font-bold tabular-nums">{formatCLP(totalActive)}</p>
              <p className="text-zinc-600 text-xs">{active.length} activos</p>
            </div>
            <div className={`bg-trago-card rounded-2xl px-4 py-3 ${paidNeverDelivered.length > 0 ? "border border-yellow-500/30" : "border border-trago-border"}`}>
              <p className="text-trago-muted text-xs mb-1 flex items-center gap-1.5">
                <AlertCircle className={`w-3.5 h-3.5 ${paidNeverDelivered.length > 0 ? "text-yellow-400" : "text-zinc-500"}`} />
                Perdidos
              </p>
              <p className={`font-bold tabular-nums ${paidNeverDelivered.length > 0 ? "text-yellow-400" : "text-white"}`}>
                {formatCLP(totalLost)}
              </p>
              <p className="text-zinc-600 text-xs">{paidNeverDelivered.length} pagados sin entregar</p>
            </div>
          </div>

          {/* ── Sections ── */}
          <div className="space-y-4">
            {paidNeverDelivered.length > 0 && (
              <Section
                label="Pagados sin entregar"
                description="Pagaron pero el pedido fue cancelado"
                accent="text-yellow-400"
                border="border-yellow-500/30"
                bg="bg-yellow-500/5"
                dot="bg-yellow-400"
                Icon={AlertCircle}
                orders={paidNeverDelivered}
              />
            )}

            <Section
              label="En curso"
              description="Aún en proceso"
              accent="text-trago-orange"
              border="border-trago-orange/30"
              bg="bg-trago-orange/5"
              dot="bg-trago-orange animate-pulse"
              Icon={Clock}
              orders={active}
              showStatus
            />

            <Section
              label="Entregados"
              description="Ventas completadas"
              accent="text-trago-green"
              border="border-trago-green/30"
              bg="bg-trago-green/5"
              dot="bg-trago-green"
              Icon={CheckCircle2}
              orders={delivered}
            />

            <Section
              label="Cancelados"
              description="Sin cargo al cliente"
              accent="text-red-400"
              border="border-red-500/20"
              bg="bg-red-500/5"
              dot="bg-red-400"
              Icon={Ban}
              orders={cancelled.filter((o) => !o.mp_payment_id)}
            />

            <Section
              label="Sin pagar"
              description="Iniciaron pero no pagaron"
              accent="text-zinc-500"
              border="border-zinc-700"
              bg=""
              dot="bg-zinc-500"
              Icon={ShoppingBag}
              orders={pending}
            />
          </div>
        </>
      )}
    </div>
  );
}
