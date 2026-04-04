"use client";

import { useEffect, useState, useRef } from "react";
import { QRCodeCanvas } from "qrcode.react";
import { Download, Trash2 } from "lucide-react";
import { formatCLP } from "@/lib/format";

interface Stats {
  revenue: number;
  orderCount: number;
  topProducts: { name: string; quantity: number }[];
}

interface SavedQr {
  id: string;
  label: string;
  venue_id: string;
  created_at: string;
  venues: { slug: string; name: string };
}

export default function DashboardPage() {
  const [stats, setStats] = useState<Stats | null>(null);
  const [loading, setLoading] = useState(true);

  // QR generator
  const [venueSlug, setVenueSlug] = useState("");
  const [qrLabel, setQrLabel] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  // Saved QRs
  const [savedQrs, setSavedQrs] = useState<SavedQr[]>([]);

  const baseUrl = process.env.NEXT_PUBLIC_BASE_URL ?? "";

  useEffect(() => {
    fetch("/api/dashboard/stats")
      .then((r) => r.json())
      .then((d) => setStats(d))
      .finally(() => setLoading(false));

    fetch("/api/dashboard/qr-codes")
      .then((r) => r.json())
      .then((d) => setSavedQrs(d.qrCodes ?? []));
  }, []);

  async function handleSaveQR(e: React.FormEvent) {
    e.preventDefault();
    const slug = venueSlug.trim();
    const label = qrLabel.trim();
    if (!slug || !label) return;

    setSaving(true);
    setError("");

    const res = await fetch("/api/dashboard/qr-codes", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ slug, label }),
    });

    if (!res.ok) {
      const data = await res.json();
      setError(
        data.error === "VENUE_NOT_FOUND"
          ? "Local no encontrado con ese slug"
          : "Error al guardar"
      );
      setSaving(false);
      return;
    }

    const { qrCode } = await res.json();
    setSavedQrs((prev) => [qrCode, ...prev]);
    setVenueSlug("");
    setQrLabel("");
    setSaving(false);
  }

  async function handleDeleteQR(id: string) {
    await fetch(`/api/dashboard/qr-codes/${id}`, { method: "DELETE" });
    setSavedQrs((prev) => prev.filter((q) => q.id !== id));
  }

  function downloadQR(canvasParent: HTMLElement | null, filename: string) {
    const canvas = canvasParent?.querySelector("canvas");
    if (!canvas) return;
    const url = canvas.toDataURL("image/png");
    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    a.click();
  }

  return (
    <div className="max-w-4xl space-y-8">
      <h1 className="text-2xl font-display">Inicio</h1>

      {/* Stats */}
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

      {/* QR Generator */}
      <section>
        <h2 className="text-lg font-semibold text-zinc-300 mb-4">Generador de QR</h2>
        <div className="bg-trago-card border border-trago-border rounded-xl p-6">
          <form onSubmit={handleSaveQR} className="flex flex-col gap-3">
            <div className="flex gap-3">
              <input
                type="text"
                value={venueSlug}
                onChange={(e) => setVenueSlug(e.target.value)}
                placeholder="Slug del local (ej: club-demo)"
                className="flex-1 px-3 py-2 bg-trago-dark border border-trago-border rounded-lg text-white placeholder-zinc-600 focus:outline-none focus:ring-2 focus:ring-trago-orange/30 focus:border-trago-orange/50 text-sm transition-all"
              />
              <input
                type="text"
                value={qrLabel}
                onChange={(e) => setQrLabel(e.target.value)}
                placeholder="Etiqueta (ej: Barra 1)"
                className="flex-1 px-3 py-2 bg-trago-dark border border-trago-border rounded-lg text-white placeholder-zinc-600 focus:outline-none focus:ring-2 focus:ring-trago-orange/30 focus:border-trago-orange/50 text-sm transition-all"
              />
            </div>
            <button
              type="submit"
              disabled={!venueSlug.trim() || !qrLabel.trim() || saving}
              className="self-start px-4 py-2 bg-trago-orange hover:bg-trago-orange-light disabled:opacity-50 text-white font-semibold rounded-lg transition-colors text-sm press-scale"
            >
              {saving ? "Guardando..." : "Crear QR"}
            </button>
          </form>

          {error && (
            <p className="mt-3 text-red-400 text-sm">{error}</p>
          )}
        </div>
      </section>

      {/* Saved QRs */}
      {savedQrs.length > 0 && (
        <section>
          <h2 className="text-lg font-semibold text-zinc-300 mb-4">QRs guardados</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {savedQrs.map((qr) => (
              <SavedQrCard
                key={qr.id}
                qr={qr}
                baseUrl={baseUrl}
                onDownload={downloadQR}
                onDelete={handleDeleteQR}
              />
            ))}
          </div>
        </section>
      )}
    </div>
  );
}

function SavedQrCard({
  qr,
  baseUrl,
  onDownload,
  onDelete,
}: {
  qr: SavedQr;
  baseUrl: string;
  onDownload: (el: HTMLElement | null, filename: string) => void;
  onDelete: (id: string) => void;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const url = `${baseUrl}/${qr.venues.slug}`;

  return (
    <div className="bg-trago-card border border-trago-border rounded-xl p-4 flex gap-4 items-center">
      <div ref={ref} className="bg-white p-2 rounded-lg shrink-0">
        <QRCodeCanvas value={url} size={80} />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-white font-medium truncate">{qr.label}</p>
        <p className="text-trago-muted text-xs truncate">{qr.venues.name} — /{qr.venues.slug}</p>
        <p className="text-zinc-600 text-xs mt-1">
          {new Date(qr.created_at).toLocaleDateString("es-CL")}
        </p>
      </div>
      <div className="flex flex-col gap-2 shrink-0">
        <button
          onClick={() => onDownload(ref.current, `qr-${qr.venues.slug}-${qr.label}.png`)}
          className="p-2 bg-trago-dark hover:bg-trago-card-hover border border-trago-border rounded-lg transition-colors"
          title="Descargar"
        >
          <Download className="w-4 h-4 text-zinc-400" />
        </button>
        <button
          onClick={() => onDelete(qr.id)}
          className="p-2 bg-trago-dark hover:bg-red-900/30 border border-trago-border rounded-lg transition-colors"
          title="Eliminar"
        >
          <Trash2 className="w-4 h-4 text-zinc-400" />
        </button>
      </div>
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
