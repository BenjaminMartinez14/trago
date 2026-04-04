"use client";

import { useEffect, useState } from "react";
import { formatCLP } from "@/lib/format";

interface Stats {
  revenue: number;
  orderCount: number;
  topProducts: { name: string; quantity: number }[];
}

export default function DashboardPage() {
  const [stats, setStats] = useState<Stats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/dashboard/stats")
      .then((r) => r.json())
      .then((d) => setStats(d))
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="max-w-4xl space-y-8">
      <h1 className="text-2xl font-display">Inicio</h1>

      <section>
        <h2 className="text-lg font-semibold text-zinc-300 mb-4">Hoy</h2>
        {loading ? (
          <div className="grid grid-cols-3 gap-4">
            {[0, 1, 2].map((i) => (
              <div key={i} className="bg-trago-card rounded-xl p-5 animate-pulse h-24 border border-trago-border" />
            ))}
          </div>
        ) : stats ? (
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <StatCard label="Ingresos" value={formatCLP(stats.revenue)} />
            <StatCard label="Pedidos" value={String(stats.orderCount)} />
            <div className="bg-trago-card border border-trago-border rounded-xl p-5">
              <p className="text-trago-muted text-sm font-medium mb-2">Top productos</p>
              {stats.topProducts.length === 0 ? (
                <p className="text-zinc-500 text-sm">Sin datos aún</p>
              ) : (
                <ol className="space-y-1">
                  {stats.topProducts.map((p, i) => (
                    <li key={i} className="flex justify-between text-sm">
                      <span className="text-zinc-300 truncate mr-2">
                        {i + 1}. {p.name}
                      </span>
                      <span className="text-zinc-400 shrink-0">{p.quantity} uds.</span>
                    </li>
                  ))}
                </ol>
              )}
            </div>
          </div>
        ) : (
          <p className="text-zinc-500 text-sm">Error al cargar estadísticas.</p>
        )}
      </section>
    </div>
  );
}

function StatCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="bg-trago-card border border-trago-border rounded-xl p-5">
      <p className="text-trago-muted text-sm font-medium mb-1">{label}</p>
      <p className="text-2xl font-bold text-white">{value}</p>
    </div>
  );
}
