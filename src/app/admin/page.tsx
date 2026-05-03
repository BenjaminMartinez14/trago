"use client";

import { useEffect, useState } from "react";
import { Building2, TrendingUp, Receipt, ShoppingBag, ExternalLink, Lock } from "lucide-react";
import { formatCLP } from "@/lib/format";
import Link from "next/link";

interface VenueRow {
  id: string;
  name: string;
  slug: string;
  active: boolean;
  commissionPct: number;
  monthlyGmv: number;
  monthlyCommission: number;
  orderCount: number;
  lastOrderAt: string | null;
}

interface AdminData {
  venues: VenueRow[];
  total: { gmv: number; commission: number; orders: number; venues: number; activeVenues: number };
}

function timeAgo(iso: string | null): string {
  if (!iso) return "Sin actividad";
  const diff = Math.floor((Date.now() - new Date(iso).getTime()) / 1000);
  if (diff < 60) return `${diff}s atrás`;
  if (diff < 3600) return `${Math.floor(diff / 60)} min atrás`;
  if (diff < 86400) return `${Math.floor(diff / 3600)} h atrás`;
  return `${Math.floor(diff / 86400)} días atrás`;
}

export default function AdminPage() {
  const [data, setData] = useState<AdminData | null>(null);
  const [loading, setLoading] = useState(true);
  const [forbidden, setForbidden] = useState(false);

  useEffect(() => {
    fetch("/api/admin/venues")
      .then(async (r) => {
        if (r.status === 403 || r.status === 401) { setForbidden(true); return null; }
        return r.json();
      })
      .then((d) => { if (d) setData(d); })
      .finally(() => setLoading(false));
  }, []);

  if (forbidden) {
    return (
      <div className="min-h-screen bg-trago-black flex flex-col items-center justify-center px-6 text-center gap-4">
        <Lock className="w-9 h-9 text-trago-orange" />
        <h2 className="text-white font-display text-xl">Acceso restringido</h2>
        <p className="text-trago-muted text-sm max-w-xs">Esta vista es solo para operadores de Trago.</p>
        <Link href="/dashboard" className="text-trago-orange text-sm hover:underline">Volver al panel</Link>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-trago-black p-6 max-w-6xl mx-auto space-y-6">
      <header className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <p className="text-trago-orange text-xs uppercase tracking-widest font-bold">Panel Trago</p>
          <h1 className="text-2xl font-display text-white">Vista de operador</h1>
          <p className="text-trago-muted text-sm">Métricas agregadas de los últimos 30 días</p>
        </div>
        <Link href="/dashboard" className="text-zinc-400 text-sm hover:text-white transition-colors">← Volver al panel</Link>
      </header>

      {loading || !data ? (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          {[0,1,2,3].map((i) => <div key={i} className="bg-trago-card rounded-2xl p-5 animate-pulse h-28 border border-trago-border" />)}
        </div>
      ) : (
        <>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            <Kpi label="GMV total" value={formatCLP(data.total.gmv)} icon={TrendingUp} highlight />
            <Kpi label="Comisión Trago" value={formatCLP(data.total.commission)} icon={Receipt} />
            <Kpi label="Pedidos" value={String(data.total.orders)} icon={ShoppingBag} />
            <Kpi label="Locales activos" value={`${data.total.activeVenues} / ${data.total.venues}`} icon={Building2} />
          </div>

          <div className="bg-trago-card border border-trago-border rounded-2xl overflow-hidden">
            <div className="px-5 py-4 border-b border-trago-border flex items-center justify-between">
              <p className="text-white font-semibold">Locales</p>
              <p className="text-zinc-500 text-xs">Ordenado por GMV</p>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-white/[0.02] border-b border-trago-border">
                  <tr className="text-zinc-500 text-xs uppercase tracking-wide">
                    <th className="text-left px-5 py-3 font-medium">Local</th>
                    <th className="text-right px-5 py-3 font-medium">GMV (30d)</th>
                    <th className="text-right px-5 py-3 font-medium hidden sm:table-cell">Comisión</th>
                    <th className="text-right px-5 py-3 font-medium hidden sm:table-cell">Pedidos</th>
                    <th className="text-right px-5 py-3 font-medium hidden md:table-cell">Última actividad</th>
                    <th className="text-right px-5 py-3 font-medium">Estado</th>
                  </tr>
                </thead>
                <tbody>
                  {[...data.venues].sort((a, b) => b.monthlyGmv - a.monthlyGmv).map((v) => (
                    <tr key={v.id} className="border-b border-trago-border last:border-0 hover:bg-white/[0.02] transition-colors">
                      <td className="px-5 py-4">
                        <a href={`/${v.slug}`} target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 text-white font-medium hover:text-trago-orange transition-colors group">
                          {v.name}
                          <ExternalLink className="w-3.5 h-3.5 opacity-0 group-hover:opacity-60 transition-opacity" />
                        </a>
                        <p className="text-zinc-500 text-xs mt-0.5">/{v.slug} · {v.commissionPct}%</p>
                      </td>
                      <td className="px-5 py-4 text-right text-white font-semibold tabular-nums">{formatCLP(v.monthlyGmv)}</td>
                      <td className="px-5 py-4 text-right text-trago-orange font-semibold tabular-nums hidden sm:table-cell">{formatCLP(v.monthlyCommission)}</td>
                      <td className="px-5 py-4 text-right text-zinc-300 tabular-nums hidden sm:table-cell">{v.orderCount}</td>
                      <td className="px-5 py-4 text-right text-zinc-500 text-xs hidden md:table-cell">{timeAgo(v.lastOrderAt)}</td>
                      <td className="px-5 py-4 text-right">
                        <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-bold ${v.active ? "text-trago-green bg-trago-green/10" : "text-zinc-500 bg-zinc-500/10"}`}>
                          <span className={`w-1.5 h-1.5 rounded-full ${v.active ? "bg-trago-green" : "bg-zinc-500"}`} />
                          {v.active ? "Activo" : "Inactivo"}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}
    </div>
  );
}

function Kpi({ label, value, icon: Icon, highlight }: { label: string; value: string; icon: React.ElementType; highlight?: boolean }) {
  return (
    <div className={`bg-trago-card border rounded-2xl p-5 flex flex-col gap-3 ${highlight ? "border-trago-orange/40" : "border-trago-border"}`}>
      <div className="flex items-center justify-between">
        <p className="text-trago-muted text-sm font-medium">{label}</p>
        <div className={`w-8 h-8 rounded-xl flex items-center justify-center ${highlight ? "bg-trago-orange/10" : "bg-white/5"}`}>
          <Icon className={`w-4 h-4 ${highlight ? "text-trago-orange" : "text-zinc-400"}`} />
        </div>
      </div>
      <p className={`text-2xl font-bold ${highlight ? "text-trago-orange" : "text-white"}`}>{value}</p>
    </div>
  );
}
