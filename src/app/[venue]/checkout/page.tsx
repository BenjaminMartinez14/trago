"use client";

import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import { initMercadoPago, Wallet } from "@mercadopago/sdk-react";
import { ArrowLeft, AlertTriangle, WifiOff, Loader2, XCircle } from "lucide-react";
import { useCart } from "@/hooks/useCart";
import { useOnlineStatus } from "@/hooks/useOnlineStatus";
import { formatCLP } from "@/lib/format";

initMercadoPago(process.env.NEXT_PUBLIC_MP_PUBLIC_KEY ?? "");

// ── Types ────────────────────────────────────────────────────────────────────

type UnavailableItem = { productId: string; name: string };
type PriceChange = { productId: string; name: string; oldPrice: number; newPrice: number };

type CheckoutState =
  | { phase: "summary" }
  | { phase: "creating" }
  | { phase: "payment"; orderId: string; preferenceId: string }
  | { phase: "unavailable"; items: UnavailableItem[] }
  | { phase: "price_changed"; changes: PriceChange[] }
  | { phase: "error"; message: string };

// ── Main page ────────────────────────────────────────────────────────────────

export default function CheckoutPage() {
  const params = useParams<{ venue: string }>();
  const router = useRouter();
  const { items, totalCLP, orderNotes, sessionId, clearCart } = useCart();
  const isOnline = useOnlineStatus();
  const slug = params.venue;

  const [state, setState] = useState<CheckoutState>({ phase: "summary" });
  // Increment to remount the Wallet Brick (same preferenceId, no new order)
  const [brickKey, setBrickKey] = useState(0);
  // Accepted price overrides after a PRICE_CHANGED response
  const [, setPriceOverrides] = useState<Map<string, number>>(new Map());

  // Redirect to menu if cart becomes empty
  useEffect(() => {
    if (items.length === 0 && state.phase === "summary") {
      router.replace(`/${slug}`);
    }
  }, [items.length, state.phase, slug, router]);

  async function submitOrder(overrides: Map<string, number> = new Map()) {
    if (!isOnline) return;
    setState({ phase: "creating" });

    try {
      const res = await fetch("/api/orders", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-session-id": sessionId,
        },
        body: JSON.stringify({
          venueSlug: slug,
          sessionId,
          items: items.map((i) => ({
            productId: i.product.id,
            quantity: i.quantity,
            unitPrice: overrides.get(i.product.id) ?? i.product.price_clp,
            notes: i.notes,
          })),
          orderNotes: orderNotes || undefined,
        }),
      });

      if (res.status === 409) {
        const data = await res.json();
        if (data.error === "UNAVAILABLE_ITEMS") {
          setState({ phase: "unavailable", items: data.unavailableItems });
        } else if (data.error === "PRICE_CHANGED") {
          setState({ phase: "price_changed", changes: data.priceChanges });
        }
        return;
      }

      if (!res.ok) {
        setState({ phase: "error", message: "No pudimos procesar tu pedido. Intenta nuevamente." });
        return;
      }

      const { orderId, preferenceId } = await res.json();
      clearCart();
      setState({ phase: "payment", orderId, preferenceId });
    } catch {
      setState({ phase: "error", message: "Error de conexión. Verifica tu red e intenta nuevamente." });
    }
  }

  function handleBrickError(error: unknown) {
    console.error("MP Wallet Brick error:", error);
    // Remount the brick with the same preferenceId — do NOT create a new order
    setBrickKey((k) => k + 1);
  }

  // ── Offline overlay ──────────────────────────────────────────────────────
  if (!isOnline) {
    return (
      <div className="min-h-screen bg-trago-black flex flex-col items-center justify-center px-6 text-center gap-4">
        <div className="w-20 h-20 rounded-full bg-trago-card border border-trago-border flex items-center justify-center">
          <WifiOff className="w-9 h-9 text-trago-orange" />
        </div>
        <h2 className="text-white font-display text-xl">Esperando conexión…</h2>
        <p className="text-trago-muted text-sm max-w-xs">
          {state.phase === "payment"
            ? "Tu pago está siendo procesado. No cierres esta pantalla."
            : "Conecta a la red para continuar con el pago."}
        </p>
        <Loader2 className="w-6 h-6 text-trago-orange animate-spin mt-2" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-trago-black">
      {/* Header */}
      <header className="sticky top-0 z-20 glass-heavy">
        <div className="flex items-center gap-3 px-4 h-16">
          <button
            onClick={() => router.back()}
            aria-label="Volver"
            className="w-10 h-10 flex items-center justify-center text-white touch-manipulation -ml-1 rounded-xl hover:bg-white/5 transition-colors"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <h1 className="text-xl font-display text-white tracking-tight">
            {state.phase === "payment" ? "Pago" : "Confirmar pedido"}
          </h1>
        </div>
      </header>

      {/* ── Summary phase ── */}
      {state.phase === "summary" && (
        <div className="px-4 py-4 pb-36">
          <div className="bg-trago-card rounded-2xl border border-trago-border overflow-hidden">
            {items.map((item, idx) => (
              <div
                key={item.product.id}
                className={[
                  "flex justify-between items-center px-4 py-3.5",
                  idx < items.length - 1 ? "border-b border-trago-border" : "",
                ].join(" ")}
              >
                <div>
                  <p className="text-white font-medium">{item.product.name}</p>
                  <p className="text-trago-muted text-sm">× {item.quantity}</p>
                </div>
                <p className="text-white font-semibold tabular-nums">
                  {formatCLP(item.product.price_clp * item.quantity)}
                </p>
              </div>
            ))}
          </div>

          {orderNotes && (
            <div className="mt-4 bg-trago-card rounded-xl p-4 border border-trago-border">
              <p className="text-trago-muted text-xs mb-1 font-medium uppercase tracking-wider">Notas</p>
              <p className="text-white text-sm">{orderNotes}</p>
            </div>
          )}

          <div className="fixed bottom-0 inset-x-0 glass-heavy px-4 py-4 pb-[max(1rem,env(safe-area-inset-bottom))]">
            <div className="flex justify-between items-center mb-3 px-1">
              <span className="text-trago-muted">Total</span>
              <span className="text-white font-bold text-xl tabular-nums">{formatCLP(totalCLP)}</span>
            </div>
            <button
              onClick={() => submitOrder()}
              className="w-full h-16 bg-trago-orange text-white font-bold text-lg rounded-2xl touch-manipulation press-scale glow-orange"
            >
              Pagar {formatCLP(totalCLP)}
            </button>
          </div>
        </div>
      )}

      {/* ── Creating phase ── */}
      {state.phase === "creating" && (
        <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4">
          <Loader2 className="w-8 h-8 text-trago-orange animate-spin" />
          <p className="text-trago-muted">Preparando tu pedido…</p>
        </div>
      )}

      {/* ── Payment phase — Wallet Brick ── */}
      {state.phase === "payment" && (
        <div className="px-4 py-6">
          <p className="text-trago-muted text-sm text-center mb-6">
            Selecciona tu método de pago
          </p>
          {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
          {(() => { const W = Wallet as any; return (
            <W
              key={brickKey}
              initialization={{ preferenceId: state.preferenceId }}
              onSubmit={() => Promise.resolve()}
              onError={handleBrickError}
            />
          ); })()}

          {process.env.NEXT_PUBLIC_MP_PUBLIC_KEY?.startsWith("TEST-") && (
            <button
              onClick={async () => {
                await fetch(`/api/orders/${state.orderId}/test-pay`, { method: "POST" });
                router.replace(`/${slug}/order/${state.orderId}`);
              }}
              className="mt-6 w-full h-12 border border-dashed border-zinc-600 text-zinc-400 hover:text-white hover:border-zinc-400 rounded-2xl text-sm font-medium transition-colors"
            >
              Pago de prueba (sin tarjeta)
            </button>
          )}
        </div>
      )}

      {/* ── Unavailable items ── */}
      {state.phase === "unavailable" && (
        <div className="px-4 py-8 flex flex-col gap-6 animate-fade-in">
          <div className="bg-trago-card rounded-2xl p-5 border border-trago-border">
            <p className="text-white font-display text-lg mb-3">Productos agotados</p>
            <p className="text-trago-muted text-sm mb-4">
              Los siguientes productos ya no están disponibles:
            </p>
            <ul className="space-y-2">
              {state.items.map((item) => (
                <li key={item.productId} className="text-white font-medium flex items-center gap-2">
                  <XCircle className="w-4 h-4 text-red-400 flex-shrink-0" />
                  {item.name}
                </li>
              ))}
            </ul>
          </div>
          <button
            onClick={() => router.back()}
            className="w-full h-14 bg-trago-orange text-white font-bold rounded-2xl touch-manipulation press-scale glow-orange-sm"
          >
            Volver al carrito
          </button>
        </div>
      )}

      {/* ── Price changed ── */}
      {state.phase === "price_changed" && (
        <div className="px-4 py-8 flex flex-col gap-6 animate-fade-in">
          <div className="bg-trago-card rounded-2xl p-5 border border-trago-border">
            <p className="text-white font-display text-lg mb-3">Precios actualizados</p>
            <p className="text-trago-muted text-sm mb-4">
              Algunos precios cambiaron. ¿Deseas continuar?
            </p>
            <ul className="space-y-3">
              {state.changes.map((c) => (
                <li key={c.productId} className="flex justify-between items-center">
                  <span className="text-white">{c.name}</span>
                  <span className="text-right tabular-nums">
                    <span className="text-zinc-500 line-through text-sm mr-2">{formatCLP(c.oldPrice)}</span>
                    <span className="text-white font-semibold">{formatCLP(c.newPrice)}</span>
                  </span>
                </li>
              ))}
            </ul>
          </div>
          <button
            onClick={() => {
              const overrides = new Map(state.changes.map((c) => [c.productId, c.newPrice]));
              setPriceOverrides(overrides);
              submitOrder(overrides);
            }}
            className="w-full h-14 bg-trago-orange text-white font-bold rounded-2xl touch-manipulation press-scale glow-orange-sm"
          >
            Aceptar y pagar
          </button>
          <button
            onClick={() => router.back()}
            className="w-full h-12 text-trago-muted font-medium touch-manipulation hover:text-white transition-colors"
          >
            Volver al carrito
          </button>
        </div>
      )}

      {/* ── Error ── */}
      {state.phase === "error" && (
        <div className="px-4 py-8 flex flex-col items-center gap-6 text-center animate-fade-in">
          <div className="w-20 h-20 rounded-full bg-red-500/10 border border-red-500/20 flex items-center justify-center">
            <AlertTriangle className="w-9 h-9 text-red-400" />
          </div>
          <p className="text-white font-semibold text-lg">{state.message}</p>
          <button
            onClick={() => setState({ phase: "summary" })}
            className="w-full h-14 bg-trago-orange text-white font-bold rounded-2xl touch-manipulation press-scale glow-orange-sm"
          >
            Intentar nuevamente
          </button>
        </div>
      )}
    </div>
  );
}
