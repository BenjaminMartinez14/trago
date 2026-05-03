"use client";

import { useState } from "react";
import { Play, ShoppingBag, CreditCard, ScanLine, CheckCircle2, ExternalLink, Loader2, Sparkles } from "lucide-react";
import { formatCLP } from "@/lib/format";

type Step = { id: string; label: string; icon: React.ElementType };

const STEPS: Step[] = [
  { id: "create",   label: "Cliente arma su pedido",    icon: ShoppingBag },
  { id: "pay",      label: "Cliente paga via Mercado Pago", icon: CreditCard },
  { id: "queue",    label: "Pedido aparece para escanear",  icon: Sparkles },
  { id: "ready",    label: "Listo para escanear en barra",  icon: ScanLine },
];

interface DemoResult {
  orderId: string;
  orderNumber: number;
  venueSlug: string;
  items: { name: string; quantity: number; unitPrice: number }[];
  totalCLP: number;
}

export default function DemoPage() {
  const [running, setRunning] = useState(false);
  const [step, setStep] = useState(0);
  const [result, setResult] = useState<DemoResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function startDemo() {
    setRunning(true);
    setError(null);
    setResult(null);
    setStep(0);

    try {
      // Step 1: simulate cart build (visual only)
      await new Promise((r) => setTimeout(r, 600));
      setStep(1);

      // Step 2: simulate payment via API
      await new Promise((r) => setTimeout(r, 600));
      const res = await fetch("/api/demo", { method: "POST" });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error ?? "Demo no disponible en producción");
      }
      const data = (await res.json()) as DemoResult;

      setStep(2);
      await new Promise((r) => setTimeout(r, 600));
      setStep(3);
      setResult(data);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Error inesperado");
    } finally {
      setRunning(false);
    }
  }

  return (
    <div className="min-h-screen bg-trago-black flex flex-col items-center px-6 py-12">
      <div className="max-w-md w-full">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 bg-trago-orange/10 border border-trago-orange/30 rounded-full mb-4">
            <Sparkles className="w-3 h-3 text-trago-orange" />
            <span className="text-trago-orange text-xs font-bold uppercase tracking-wider">Modo Demo</span>
          </div>
          <h1 className="text-white font-display text-4xl mb-2">Trago en 60 segundos</h1>
          <p className="text-trago-muted text-sm">Mira el flujo completo: pedido, pago, cocina y entrega.</p>
        </div>

        {/* Steps timeline */}
        <div className="bg-trago-card border border-trago-border rounded-2xl p-5 mb-6">
          <div className="space-y-3">
            {STEPS.map((s, i) => {
              const isDone   = step > i || (step === i && !running);
              const isActive = running && step === i;
              const Icon     = s.icon;
              return (
                <div key={s.id} className="flex items-center gap-3">
                  <div className={`w-9 h-9 rounded-xl flex items-center justify-center transition-all ${
                    isActive ? "bg-trago-orange text-white animate-pulse"
                    : isDone   ? "bg-trago-green/20 text-trago-green"
                    : "bg-white/5 text-zinc-600"
                  }`}>
                    {isActive ? <Loader2 className="w-4 h-4 animate-spin" />
                     : isDone   ? <CheckCircle2 className="w-4 h-4" />
                                : <Icon className="w-4 h-4" />}
                  </div>
                  <p className={`text-sm font-medium ${
                    isActive ? "text-white" : isDone ? "text-zinc-300" : "text-zinc-600"
                  }`}>
                    {s.label}
                  </p>
                </div>
              );
            })}
          </div>
        </div>

        {/* CTA / Result */}
        {!result && !error && (
          <button
            onClick={startDemo}
            disabled={running}
            className="w-full h-14 bg-trago-orange text-white font-bold text-base rounded-2xl glow-orange touch-manipulation press-scale disabled:opacity-50 flex items-center justify-center gap-2"
          >
            <Play className="w-5 h-5" />
            {running ? "Ejecutando demo…" : "Iniciar demo"}
          </button>
        )}

        {error && (
          <div className="bg-red-500/10 border border-red-500/20 rounded-2xl p-5 text-center space-y-2">
            <p className="text-red-400 font-semibold text-sm">{error}</p>
            <button onClick={startDemo} className="text-trago-orange text-xs underline">Reintentar</button>
          </div>
        )}

        {result && (
          <div className="space-y-3 animate-fade-in">
            <div className="bg-trago-card border border-trago-orange/40 rounded-2xl p-5">
              <p className="text-trago-orange text-xs font-bold uppercase tracking-wider mb-1">Pedido creado</p>
              <p className="text-white font-display text-3xl mb-2">#{result.orderNumber}</p>
              <div className="text-zinc-400 text-sm space-y-0.5">
                {result.items.map((it, i) => (
                  <p key={i}>{it.name} ×{it.quantity}</p>
                ))}
              </div>
              <div className="border-t border-trago-border mt-3 pt-3 flex justify-between">
                <span className="text-trago-muted text-sm">Total</span>
                <span className="text-white font-bold tabular-nums">{formatCLP(result.totalCLP)}</span>
              </div>
            </div>

            <a
              href={`/${result.venueSlug}/order/${result.orderId}`}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center justify-between bg-trago-card border border-trago-border rounded-xl px-4 py-3 hover:border-trago-orange/50 transition-all group"
            >
              <div className="flex items-center gap-3">
                <ShoppingBag className="w-4 h-4 text-trago-orange" />
                <span className="text-white text-sm font-medium">Vista cliente (con QR)</span>
              </div>
              <ExternalLink className="w-4 h-4 text-zinc-500 group-hover:text-white transition-colors" />
            </a>

            <a
              href="/staff/scan"
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center justify-between bg-trago-card border border-trago-border rounded-xl px-4 py-3 hover:border-trago-orange/50 transition-all group"
            >
              <div className="flex items-center gap-3">
                <ScanLine className="w-4 h-4 text-trago-orange" />
                <span className="text-white text-sm font-medium">Vista barman (escanear)</span>
              </div>
              <ExternalLink className="w-4 h-4 text-zinc-500 group-hover:text-white transition-colors" />
            </a>

            <a
              href="/dashboard"
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center justify-between bg-trago-card border border-trago-border rounded-xl px-4 py-3 hover:border-trago-orange/50 transition-all group"
            >
              <div className="flex items-center gap-3">
                <Sparkles className="w-4 h-4 text-trago-orange" />
                <span className="text-white text-sm font-medium">Panel del local</span>
              </div>
              <ExternalLink className="w-4 h-4 text-zinc-500 group-hover:text-white transition-colors" />
            </a>

            <button
              onClick={startDemo}
              className="w-full h-12 bg-trago-card border border-trago-border text-zinc-300 font-medium text-sm rounded-xl hover:border-zinc-500 transition-all"
            >
              Ejecutar otro pedido demo
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
