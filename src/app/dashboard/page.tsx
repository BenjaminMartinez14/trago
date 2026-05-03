"use client";

import { useEffect, useState } from "react";
import { TrendingUp, ShoppingBag, Heart, Receipt, CheckCircle2, Ban, Clock, Users } from "lucide-react";
import { formatCLP } from "@/lib/format";

interface HourlyBucket { hour: number; revenue: number; orders: number }
interface TopProduct   { name: string; quantity: number; revenue: number }

interface Stats {
  revenue:       number;
  tips:          number;
  orderCount:    number;
  avgOrderValue: number;
  funnel:        { pending: number; initiated: number; paid: number; delivered: number; cancelled: number };
  hourlyRevenue: HourlyBucket[];
  topProducts:   TopProduct[];
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function pct(n: number, total: number) {
  return total === 0 ? 0 : Math.round((n / total) * 100);
}

// ── Sub-components ─────────────────────────────────────────────────────────────

function StatCard({
  label, value, sub, icon: Icon, highlight,
}: {
  label: string; value: string; sub?: string;
  icon: React.ElementType; highlight?: boolean;
}) {
  return (
    <div className={`bg-trago-card border rounded-2xl p-5 flex flex-col gap-3 ${highlight ? "border-trago-orange/40" : "border-trago-border"}`}>
      <div className="flex items-center justify-between">
        <p className="text-trago-muted text-sm font-medium">{label}</p>
        <div className={`w-8 h-8 rounded-xl flex items-center justify-center ${highlight ? "bg-trago-orange/10" : "bg-white/5"}`}>
          <Icon className={`w-4 h-4 ${highlight ? "text-trago-orange" : "text-zinc-400"}`} />
        </div>
      </div>
      <div>
        <p className={`text-2xl font-bold ${highlight ? "text-trago-orange" : "text-white"}`}>{value}</p>
        {sub && <p className="text-zinc-500 text-xs mt-0.5">{sub}</p>}
      </div>
    </div>
  );
}

function HourlyChart({ data }: { data: HourlyBucket[] }) {
  const currentHour = new Date().getHours();
  const maxRevenue  = Math.max(...data.map((d) => d.revenue), 1);

  // Show bars 10am–4am (club operating window) — hours 10 to 27 mod 24
  const hours = Array.from({ length: 18 }, (_, i) => (i + 10) % 24);

  return (
    <div className="bg-trago-card border border-trago-border rounded-2xl p-5">
      <div className="flex items-center justify-between mb-4">
        <p className="text-white font-semibold text-sm">Ingresos por hora</p>
        <p className="text-zinc-500 text-xs">Hoy</p>
      </div>
      <div className="flex items-end gap-1 h-24">
        {hours.map((hour) => {
          const bucket = data[hour];
          const heightPct = bucket.revenue > 0 ? Math.max((bucket.revenue / maxRevenue) * 100, 8) : 0;
          const isCurrent = hour === currentHour;
          const hasData   = bucket.revenue > 0;
          return (
            <div key={hour} className="flex-1 flex flex-col items-center gap-1 group relative">
              {bucket.orders > 0 && (
                <div className="absolute bottom-full mb-8 bg-zinc-800 text-white text-xs rounded-lg px-2 py-1 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none whitespace-nowrap z-10 left-1/2 -translate-x-1/2">
                  {formatCLP(bucket.revenue)} · {bucket.orders} ped.
                </div>
              )}
              <div className="w-full flex items-end" style={{ height: 80 }}>
                <div
                  className={`w-full rounded-t-sm transition-all ${
                    isCurrent
                      ? "bg-trago-orange"
                      : hasData
                        ? "bg-trago-orange/40 group-hover:bg-trago-orange/60"
                        : "bg-white/5"
                  }`}
                  style={{ height: hasData ? `${heightPct}%` : "4px" }}
                />
              </div>
              <p className={`text-[10px] ${isCurrent ? "text-trago-orange font-semibold" : "text-zinc-600"}`}>
                {hour === 0 ? "0" : hour}
              </p>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function ConversionFunnel({ funnel }: { funnel: Stats["funnel"] }) {
  const total = funnel.paid + funnel.cancelled + funnel.pending;
  const steps = [
    { label: "Iniciaron pago",    value: funnel.initiated, icon: Users,        color: "bg-zinc-600"           },
    { label: "Pagaron",           value: funnel.paid,      icon: CheckCircle2, color: "bg-trago-orange"       },
    { label: "Entregados",        value: funnel.delivered, icon: TrendingUp,   color: "bg-trago-green"        },
    { label: "Cancelados",        value: funnel.cancelled, icon: Ban,          color: "bg-red-500"            },
  ];

  return (
    <div className="bg-trago-card border border-trago-border rounded-2xl p-5">
      <div className="flex items-center justify-between mb-4">
        <p className="text-white font-semibold text-sm">Embudo del día</p>
        <p className="text-zinc-500 text-xs">{total} órdenes creadas</p>
      </div>
      <div className="space-y-3">
        {steps.map(({ label, value, icon: Icon, color }) => {
          const p = pct(value, funnel.initiated || 1);
          return (
            <div key={label}>
              <div className="flex items-center justify-between mb-1">
                <div className="flex items-center gap-2">
                  <Icon className="w-3.5 h-3.5 text-zinc-400" />
                  <span className="text-zinc-300 text-xs">{label}</span>
                </div>
                <span className="text-white text-xs font-semibold tabular-nums">
                  {value} <span className="text-zinc-500 font-normal">({p}%)</span>
                </span>
              </div>
              <div className="h-1.5 bg-white/5 rounded-full overflow-hidden">
                <div
                  className={`h-full ${color} rounded-full transition-all duration-500`}
                  style={{ width: `${p}%` }}
                />
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function TopProductsCard({ products }: { products: TopProduct[] }) {
  const maxRevenue = Math.max(...products.map((p) => p.revenue), 1);

  return (
    <div className="bg-trago-card border border-trago-border rounded-2xl p-5">
      <p className="text-white font-semibold text-sm mb-4">Productos más vendidos</p>
      {products.length === 0 ? (
        <p className="text-zinc-500 text-sm">Sin datos aún</p>
      ) : (
        <div className="space-y-3">
          {products.map((p, i) => (
            <div key={i}>
              <div className="flex items-center justify-between mb-1">
                <span className="text-zinc-300 text-xs truncate mr-3 flex items-center gap-1.5">
                  <span className="text-zinc-600 font-mono text-[10px] w-3">{i + 1}.</span>
                  {p.name}
                </span>
                <span className="text-white text-xs font-semibold tabular-nums flex-shrink-0">
                  {formatCLP(p.revenue)}
                  <span className="text-zinc-500 font-normal ml-1">({p.quantity} uds.)</span>
                </span>
              </div>
              <div className="h-1 bg-white/5 rounded-full overflow-hidden">
                <div
                  className="h-full bg-trago-orange/60 rounded-full transition-all duration-500"
                  style={{ width: `${(p.revenue / maxRevenue) * 100}%` }}
                />
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ── Page ──────────────────────────────────────────────────────────────────────

export default function DashboardPage() {
  const [stats, setStats]   = useState<Stats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/dashboard/stats")
      .then((r) => r.json())
      .then((d) => setStats(d))
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="max-w-5xl space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-display">Inicio</h1>
        <p className="text-zinc-500 text-sm">
          {new Date().toLocaleDateString("es-CL", { weekday: "long", day: "numeric", month: "long" })}
        </p>
      </div>

      {loading ? (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          {[0, 1, 2, 3].map((i) => (
            <div key={i} className="bg-trago-card rounded-2xl p-5 animate-pulse h-28 border border-trago-border" />
          ))}
        </div>
      ) : !stats ? (
        <p className="text-zinc-500 text-sm">Error al cargar estadísticas.</p>
      ) : (
        <>
          {/* ── KPI cards ─────────────────────────────────────────────────── */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            <StatCard
              label="Ingresos"
              value={formatCLP(stats.revenue)}
              sub={`${stats.orderCount} pedidos`}
              icon={TrendingUp}
            />
            <StatCard
              label="Ticket promedio"
              value={formatCLP(stats.avgOrderValue)}
              sub="por pedido"
              icon={Receipt}
            />
            <StatCard
              label="Propinas"
              value={stats.tips > 0 ? formatCLP(stats.tips) : "—"}
              sub={stats.tips > 0 ? "para el staff" : "sin propinas hoy"}
              icon={Heart}
              highlight={stats.tips > 0}
            />
            <StatCard
              label="Entregados"
              value={String(stats.funnel.delivered)}
              sub={`${pct(stats.funnel.delivered, stats.funnel.paid)}% completados`}
              icon={CheckCircle2}
            />
          </div>

          {/* ── Hourly chart + Funnel ──────────────────────────────────────── */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
            <div className="lg:col-span-2">
              <HourlyChart data={stats.hourlyRevenue} />
            </div>
            <ConversionFunnel funnel={stats.funnel} />
          </div>

          {/* ── Top products ───────────────────────────────────────────────── */}
          <TopProductsCard products={stats.topProducts} />
        </>
      )}
    </div>
  );
}
