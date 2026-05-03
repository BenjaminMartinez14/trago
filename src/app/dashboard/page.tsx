"use client";

import { useEffect, useState, useMemo } from "react";
import { TrendingUp, Heart, Receipt, CheckCircle2, Ban, Users, Download, ArrowUp, ArrowDown, Minus, MapPin, Timer, Zap } from "lucide-react";
import { AreaChart, Area, ResponsiveContainer, XAxis, YAxis, Tooltip, CartesianGrid } from "recharts";
import { formatCLP } from "@/lib/format";

type RangePreset = "today" | "7d" | "30d";

interface DailyBucket  { date: string; revenue: number; orders: number }
interface HourlyBucket { hour: number; revenue: number; orders: number }
interface HeatmapCell  { dow: number; hour: number; revenue: number; orders: number }
interface TopProduct   { name: string; quantity: number; revenue: number }
interface StationMetric { id: string; name: string; orderCount: number; gmv: number; avgFulfillmentSec: number; ordersPerHour: number; active: boolean }

interface Stats {
  range: { preset: string; from: string; to: string };
  revenue: number;
  tips: number;
  orderCount: number;
  avgOrderValue: number;
  funnel: { pending: number; initiated: number; paid: number; delivered: number; cancelled: number };
  previous: { revenue: number; orderCount: number; avgOrderValue: number; tips: number };
  dailyRevenue: DailyBucket[];
  hourlyRevenue: HourlyBucket[];
  heatmap: HeatmapCell[];
  topProducts: TopProduct[];
}

function pct(n: number, total: number) { return total === 0 ? 0 : Math.round((n / total) * 100); }

function deltaPct(current: number, previous: number): number | null {
  if (previous === 0) return current > 0 ? 100 : null;
  return Math.round(((current - previous) / previous) * 100);
}

// ── Range picker ─────────────────────────────────────────────────────────────

function RangePicker({ value, onChange }: { value: RangePreset; onChange: (v: RangePreset) => void }) {
  const opts: { id: RangePreset; label: string }[] = [
    { id: "today", label: "Hoy" },
    { id: "7d",    label: "7 días" },
    { id: "30d",   label: "30 días" },
  ];
  return (
    <div className="inline-flex bg-trago-card border border-trago-border rounded-xl p-0.5">
      {opts.map((o) => (
        <button
          key={o.id}
          onClick={() => onChange(o.id)}
          className={`px-3.5 py-1.5 text-xs font-semibold rounded-lg transition-all ${
            value === o.id ? "bg-trago-orange text-white" : "text-zinc-400 hover:text-white"
          }`}
        >
          {o.label}
        </button>
      ))}
    </div>
  );
}

// ── Delta badge ──────────────────────────────────────────────────────────────

function DeltaBadge({ delta }: { delta: number | null }) {
  if (delta === null) return null;
  const isUp   = delta > 0;
  const isFlat = delta === 0;
  const Icon   = isFlat ? Minus : isUp ? ArrowUp : ArrowDown;
  const color  = isFlat ? "text-zinc-500 bg-zinc-500/10"
              : isUp    ? "text-trago-green bg-trago-green/10"
                        : "text-red-400 bg-red-400/10";
  return (
    <span className={`inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded-md text-[10px] font-bold ${color}`}>
      <Icon className="w-2.5 h-2.5" />
      {Math.abs(delta)}%
    </span>
  );
}

// ── KPI card ─────────────────────────────────────────────────────────────────

function StatCard({ label, value, sub, delta, icon: Icon, highlight }: {
  label: string; value: string; sub?: string; delta?: number | null;
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
        <div className="flex items-baseline gap-2 flex-wrap">
          <p className={`text-2xl font-bold ${highlight ? "text-trago-orange" : "text-white"}`}>{value}</p>
          {delta !== undefined && <DeltaBadge delta={delta ?? null} />}
        </div>
        {sub && <p className="text-zinc-500 text-xs mt-0.5">{sub}</p>}
      </div>
    </div>
  );
}

// ── Trend chart ──────────────────────────────────────────────────────────────

function TrendChart({ data }: { data: DailyBucket[] }) {
  const formatted = data.map((d) => ({
    ...d,
    label: new Date(d.date + "T00:00:00").toLocaleDateString("es-CL", { day: "numeric", month: "short" }),
  }));
  return (
    <div className="bg-trago-card border border-trago-border rounded-2xl p-5">
      <p className="text-white font-semibold text-sm mb-4">Tendencia de ingresos</p>
      <div style={{ width: "100%", height: 220 }}>
        <ResponsiveContainer>
          <AreaChart data={formatted} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
            <defs>
              <linearGradient id="revGradient" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%"   stopColor="#f97316" stopOpacity={0.4} />
                <stop offset="100%" stopColor="#f97316" stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="#27272a" vertical={false} />
            <XAxis dataKey="label" stroke="#71717a" fontSize={11} tickLine={false} axisLine={false} />
            <YAxis stroke="#71717a" fontSize={11} tickLine={false} axisLine={false} tickFormatter={(v) => `$${(v / 1000).toFixed(0)}K`} />
            <Tooltip
              contentStyle={{ background: "#111111", border: "1px solid #27272a", borderRadius: 12, fontSize: 12 }}
              labelStyle={{ color: "#fff", fontWeight: 600, marginBottom: 4 }}
              formatter={(v) => [formatCLP(Number(v)), "Ingresos"]}
            />
            <Area type="monotone" dataKey="revenue" stroke="#f97316" strokeWidth={2} fill="url(#revGradient)" />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}

// ── Hourly heatmap ───────────────────────────────────────────────────────────

const DOW_LABELS = ["D", "L", "M", "M", "J", "V", "S"];

function Heatmap({ data }: { data: HeatmapCell[] }) {
  const max = Math.max(...data.map((c) => c.revenue), 1);
  // operating window 18:00 - 04:00 (18..23, 0..4)
  const hours = [...Array.from({ length: 6 }, (_, i) => 18 + i), 0, 1, 2, 3, 4];

  return (
    <div className="bg-trago-card border border-trago-border rounded-2xl p-5">
      <div className="flex items-center justify-between mb-4">
        <p className="text-white font-semibold text-sm">Mapa de calor — día y hora</p>
        <p className="text-zinc-500 text-xs">{hours[0]}h–{hours[hours.length - 1]}h</p>
      </div>
      <div className="overflow-x-auto">
        <div className="inline-grid gap-0.5" style={{ gridTemplateColumns: `auto repeat(${hours.length}, minmax(22px, 1fr))` }}>
          {/* Header row */}
          <div />
          {hours.map((h) => (
            <div key={`h-${h}`} className="text-[10px] text-zinc-500 text-center font-mono">{h}</div>
          ))}
          {/* DOW rows */}
          {[1, 2, 3, 4, 5, 6, 0].map((dow) => (
            <RowBuilder key={`row-${dow}`} dow={dow} hours={hours} data={data} max={max} />
          ))}
        </div>
      </div>
      <p className="text-zinc-600 text-[10px] mt-3 text-center">Más oscuro = más ingresos</p>
    </div>
  );
}

function RowBuilder({ dow, hours, data, max }: { dow: number; hours: number[]; data: HeatmapCell[]; max: number }) {
  return (
    <>
      <div className="text-[10px] text-zinc-500 self-center pr-2">{DOW_LABELS[dow]}</div>
      {hours.map((h) => {
        const cell = data.find((c) => c.dow === dow && c.hour === h);
        const intensity = cell ? cell.revenue / max : 0;
        const opacity = intensity > 0 ? Math.max(0.08, intensity) : 0.04;
        return (
          <div
            key={`${dow}-${h}`}
            className="aspect-square rounded-sm group relative"
            style={{ backgroundColor: `rgba(249, 115, 22, ${opacity})` }}
            title={cell && cell.orders > 0 ? `${formatCLP(cell.revenue)} · ${cell.orders} ped.` : "—"}
          />
        );
      })}
    </>
  );
}

// ── Conversion funnel (kept) ─────────────────────────────────────────────────

function ConversionFunnel({ funnel }: { funnel: Stats["funnel"] }) {
  const steps = [
    { label: "Iniciaron pago",  value: funnel.initiated, icon: Users,        color: "bg-zinc-600"     },
    { label: "Pagaron",         value: funnel.paid,      icon: CheckCircle2, color: "bg-trago-orange" },
    { label: "Entregados",      value: funnel.delivered, icon: TrendingUp,   color: "bg-trago-green"  },
    { label: "Cancelados",      value: funnel.cancelled, icon: Ban,          color: "bg-red-500"      },
  ];
  return (
    <div className="bg-trago-card border border-trago-border rounded-2xl p-5">
      <p className="text-white font-semibold text-sm mb-4">Embudo de conversión</p>
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
                <div className={`h-full ${color} rounded-full transition-all duration-500`} style={{ width: `${p}%` }} />
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ── Top products ─────────────────────────────────────────────────────────────

function TopProductsCard({ products }: { products: TopProduct[] }) {
  const max = Math.max(...products.map((p) => p.revenue), 1);
  return (
    <div className="bg-trago-card border border-trago-border rounded-2xl p-5">
      <p className="text-white font-semibold text-sm mb-4">Productos más vendidos</p>
      {products.length === 0 ? (
        <p className="text-zinc-500 text-sm">Sin datos en este rango</p>
      ) : (
        <div className="space-y-3">
          {products.slice(0, 10).map((p, i) => (
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
                <div className="h-full bg-trago-orange/60 rounded-full transition-all duration-500" style={{ width: `${(p.revenue / max) * 100}%` }} />
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ── Station leaderboard ──────────────────────────────────────────────────────

function fmtDuration(sec: number): string {
  if (sec === 0) return "—";
  if (sec < 60) return `${sec}s`;
  const m = Math.floor(sec / 60);
  return m < 60 ? `${m} min` : `${Math.floor(m / 60)}h ${m % 60}m`;
}

function StationLeaderboard({ stations }: { stations: StationMetric[] }) {
  const sorted = [...stations].sort((a, b) => b.gmv - a.gmv);
  return (
    <div className="bg-trago-card border border-trago-border rounded-2xl p-5">
      <div className="flex items-center justify-between mb-4">
        <p className="text-white font-semibold text-sm">Rendimiento por estación</p>
        <p className="text-zinc-500 text-xs">Últimos 30 días</p>
      </div>
      {sorted.length === 0 ? (
        <p className="text-zinc-500 text-sm">Sin datos de estaciones aún</p>
      ) : (
        <div className="space-y-2">
          {sorted.map((s, i) => (
            <div key={s.id} className="flex items-center gap-3 px-3 py-2.5 bg-white/[0.02] rounded-xl">
              <div className="w-7 h-7 rounded-lg bg-trago-orange/10 flex items-center justify-center text-trago-orange font-bold text-xs">
                {i + 1}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-white text-sm font-medium flex items-center gap-1.5">
                  <MapPin className="w-3 h-3 text-zinc-500" />
                  {s.name}
                </p>
                <div className="flex items-center gap-3 mt-0.5 text-[11px] text-zinc-500">
                  <span className="flex items-center gap-0.5"><Zap className="w-3 h-3" />{s.ordersPerHour}/hr</span>
                  <span className="flex items-center gap-0.5"><Timer className="w-3 h-3" />{fmtDuration(s.avgFulfillmentSec)} prom.</span>
                </div>
              </div>
              <div className="text-right">
                <p className="text-white font-bold text-sm tabular-nums">{formatCLP(s.gmv)}</p>
                <p className="text-zinc-500 text-[11px]">{s.orderCount} pedidos</p>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ── Page ─────────────────────────────────────────────────────────────────────

export default function DashboardPage() {
  const [range, setRange] = useState<RangePreset>("today");
  const [stats, setStats] = useState<Stats | null>(null);
  const [stationMetrics, setStationMetrics] = useState<StationMetric[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    Promise.all([
      fetch(`/api/dashboard/stats?range=${range}`).then((r) => r.json()),
      fetch(`/api/dashboard/station-metrics`).then((r) => r.json()),
    ])
      .then(([s, sm]) => { setStats(s); setStationMetrics(sm.stations ?? []); })
      .finally(() => setLoading(false));
  }, [range]);

  const deltaRevenue = useMemo(() => stats ? deltaPct(stats.revenue, stats.previous.revenue) : null, [stats]);
  const deltaOrders  = useMemo(() => stats ? deltaPct(stats.orderCount, stats.previous.orderCount) : null, [stats]);
  const deltaAvg     = useMemo(() => stats ? deltaPct(stats.avgOrderValue, stats.previous.avgOrderValue) : null, [stats]);
  const deltaTips    = useMemo(() => stats ? deltaPct(stats.tips, stats.previous.tips) : null, [stats]);

  function handleExport() {
    if (!stats) return;
    window.location.href = `/api/dashboard/export?from=${stats.range.from}&to=${stats.range.to}`;
  }

  return (
    <div className="max-w-6xl space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <h1 className="text-2xl font-display">Inicio</h1>
        <div className="flex items-center gap-2">
          <RangePicker value={range} onChange={setRange} />
          <button
            onClick={handleExport}
            disabled={!stats}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-trago-card border border-trago-border rounded-xl text-xs font-semibold text-zinc-300 hover:text-white hover:border-zinc-500 transition-all disabled:opacity-50"
          >
            <Download className="w-3.5 h-3.5" />
            CSV
          </button>
        </div>
      </div>

      {loading || !stats ? (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          {[0,1,2,3].map((i) => <div key={i} className="bg-trago-card rounded-2xl p-5 animate-pulse h-28 border border-trago-border" />)}
        </div>
      ) : (
        <>
          {/* KPIs */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            <StatCard label="Ingresos" value={formatCLP(stats.revenue)} sub={`${stats.orderCount} pedidos`} delta={deltaRevenue} icon={TrendingUp} />
            <StatCard label="Ticket promedio" value={formatCLP(stats.avgOrderValue)} sub="por pedido" delta={deltaAvg} icon={Receipt} />
            <StatCard label="Propinas" value={stats.tips > 0 ? formatCLP(stats.tips) : "—"} sub={stats.tips > 0 ? "para el staff" : "sin propinas"} delta={deltaTips} icon={Heart} highlight={stats.tips > 0} />
            <StatCard label="Pedidos pagados" value={String(stats.orderCount)} sub={`${pct(stats.funnel.delivered, stats.funnel.paid)}% entregados`} delta={deltaOrders} icon={CheckCircle2} />
          </div>

          {/* Trend + funnel */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
            <div className="lg:col-span-2"><TrendChart data={stats.dailyRevenue} /></div>
            <ConversionFunnel funnel={stats.funnel} />
          </div>

          {/* Heatmap + top products */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
            <div className="lg:col-span-2"><Heatmap data={stats.heatmap} /></div>
            <TopProductsCard products={stats.topProducts} />
          </div>

          {/* Station leaderboard */}
          <StationLeaderboard stations={stationMetrics} />
        </>
      )}
    </div>
  );
}
