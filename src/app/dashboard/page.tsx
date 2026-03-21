"use client";

import { useEffect, useState, useRef } from "react";
import { QRCodeCanvas } from "qrcode.react";
import { formatCLP } from "@/lib/format";

interface Stats {
  revenue: number;
  orderCount: number;
  topProducts: { name: string; quantity: number }[];
}

export default function DashboardPage() {
  const [stats, setStats] = useState<Stats | null>(null);
  const [loading, setLoading] = useState(true);

  // QR generator
  const [venueSlug, setVenueSlug] = useState("");
  const [qrSlug, setQrSlug] = useState("");
  const qrRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    fetch("/api/dashboard/stats")
      .then((r) => r.json())
      .then((d) => setStats(d))
      .finally(() => setLoading(false));
  }, []);

  function handleGenerateQR(e: React.FormEvent) {
    e.preventDefault();
    setQrSlug(venueSlug.trim());
  }

  function handleDownloadQR() {
    const canvas = qrRef.current?.querySelector("canvas");
    if (!canvas) return;
    const url = canvas.toDataURL("image/png");
    const a = document.createElement("a");
    a.href = url;
    a.download = `qr-${qrSlug}.png`;
    a.click();
  }

  const qrUrl = qrSlug
    ? `${process.env.NEXT_PUBLIC_BASE_URL ?? ""}/${qrSlug}`
    : "";

  return (
    <div className="max-w-4xl space-y-8">
      <h1 className="text-2xl font-bold">Inicio</h1>

      {/* Stats */}
      <section>
        <h2 className="text-lg font-semibold text-zinc-300 mb-4">Hoy</h2>
        {loading ? (
          <div className="grid grid-cols-3 gap-4">
            {[0, 1, 2].map((i) => (
              <div key={i} className="bg-zinc-900 rounded-xl p-5 animate-pulse h-24" />
            ))}
          </div>
        ) : stats ? (
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <StatCard label="Ingresos" value={formatCLP(stats.revenue)} />
            <StatCard label="Pedidos" value={String(stats.orderCount)} />
            <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-5">
              <p className="text-zinc-400 text-sm font-medium mb-2">Top productos</p>
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

      {/* QR Generator */}
      <section>
        <h2 className="text-lg font-semibold text-zinc-300 mb-4">Generador de QR</h2>
        <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-6">
          <form onSubmit={handleGenerateQR} className="flex gap-3 mb-6">
            <input
              type="text"
              value={venueSlug}
              onChange={(e) => setVenueSlug(e.target.value)}
              placeholder="slug del local (ej: club-demo)"
              className="flex-1 px-3 py-2 bg-zinc-800 border border-zinc-700 rounded-lg text-white placeholder-zinc-500 focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-transparent text-sm"
            />
            <button
              type="submit"
              disabled={!venueSlug.trim()}
              className="px-4 py-2 bg-amber-500 hover:bg-amber-400 disabled:opacity-50 text-black font-semibold rounded-lg transition-colors text-sm shrink-0"
            >
              Generar
            </button>
          </form>

          {qrSlug && (
            <div className="flex flex-col items-center gap-4">
              <div ref={qrRef} className="bg-white p-4 rounded-xl">
                <QRCodeCanvas value={qrUrl} size={200} />
              </div>
              <p className="text-zinc-400 text-sm">{qrUrl}</p>
              <button
                onClick={handleDownloadQR}
                className="px-4 py-2 bg-zinc-800 hover:bg-zinc-700 text-white text-sm font-medium rounded-lg transition-colors"
              >
                Descargar PNG
              </button>
            </div>
          )}
        </div>
      </section>
    </div>
  );
}

function StatCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-5">
      <p className="text-zinc-400 text-sm font-medium mb-1">{label}</p>
      <p className="text-2xl font-bold text-white">{value}</p>
    </div>
  );
}
