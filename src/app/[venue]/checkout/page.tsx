"use client";

import { useState, useEffect, useRef } from "react";
import { useParams, useRouter } from "next/navigation";
import { initMercadoPago, Wallet } from "@mercadopago/sdk-react";
import { ArrowLeft, AlertTriangle, WifiOff, Loader2, XCircle, Phone } from "lucide-react";
import { useCart } from "@/hooks/useCart";
import { useOnlineStatus } from "@/hooks/useOnlineStatus";
import { formatCLP } from "@/lib/format";

initMercadoPago(process.env.NEXT_PUBLIC_MP_PUBLIC_KEY ?? "");

type UnavailableItem = { productId: string; name: string };
type PriceChange = { productId: string; name: string; oldPrice: number; newPrice: number };

type CheckoutState =
  | { phase: "phone" }
  | { phase: "creating" }
  | { phase: "ready"; orderId: string; preferenceId: string }
  | { phase: "unavailable"; items: UnavailableItem[] }
  | { phase: "price_changed"; changes: PriceChange[] }
  | { phase: "error"; message: string };

function normalizeChileanPhone(raw: string): string | null {
  const d = raw.replace(/[\s\-().+]/g, "");
  if (/^9\d{8}$/.test(d)) return `+56${d}`;
  if (/^569\d{8}$/.test(d)) return `+${d}`;
  if (/^\d{8,15}$/.test(d)) return `+${d}`;
  return null;
}

export default function CheckoutPage() {
  const params = useParams<{ venue: string }>();
  const router = useRouter();
  const { items, totalCLP, orderNotes, sessionId, stationId, customerPhone, setCustomerPhone, clearCart } = useCart();
  const isOnline = useOnlineStatus();
  const slug = params.venue;

  const [state, setState] = useState<CheckoutState>(() =>
    customerPhone ? { phase: "creating" } : { phase: "phone" }
  );
  const [brickKey, setBrickKey] = useState(0);
  const [priceOverrides, setPriceOverrides] = useState<Map<string, number>>(new Map());
  const submitted = useRef(false);

  const [phoneInput, setPhoneInput] = useState(customerPhone ?? "");
  const [phoneError, setPhoneError] = useState("");

  useEffect(() => {
    if (items.length === 0) { router.replace(`/${slug}`); return; }
    if (state.phase === "creating" && !submitted.current) {
      submitted.current = true;
      submitOrder(new Map());
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function submitOrder(overrides: Map<string, number>) {
    if (!isOnline) return;
    setState({ phase: "creating" });
    try {
      const res = await fetch("/api/orders", {
        method: "POST",
        headers: { "Content-Type": "application/json", "x-session-id": sessionId },
        body: JSON.stringify({
          venueSlug: slug,
          sessionId,
          stationId: stationId ?? undefined,
          customerPhone: customerPhone ?? undefined,
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
        if (data.error === "UNAVAILABLE_ITEMS") setState({ phase: "unavailable", items: data.unavailableItems });
        else if (data.error === "PRICE_CHANGED") setState({ phase: "price_changed", changes: data.priceChanges });
        return;
      }
      if (!res.ok) { setState({ phase: "error", message: "No pudimos procesar tu pedido. Intenta nuevamente." }); return; }

      const { orderId, preferenceId } = await res.json();
      clearCart();
      setState({ phase: "ready", orderId, preferenceId });
    } catch {
      setState({ phase: "error", message: "Error de conexión. Verifica tu red e intenta nuevamente." });
    }
  }

  function handlePhoneContinue() {
    const normalized = normalizeChileanPhone(phoneInput);
    if (!normalized) { setPhoneError("Ingresa un número válido (ej: +56 9 1234 5678)"); return; }
    setPhoneError("");
    setCustomerPhone(normalized);
    submitted.current = false;
    submitOrder(new Map());
  }

  if (!isOnline) {
    return (
      <div className="min-h-screen bg-trago-black flex flex-col items-center justify-center px-6 text-center gap-4">
        <WifiOff className="w-9 h-9 text-trago-orange" />
        <h2 className="text-white font-display text-xl">Esperando conexión…</h2>
        <Loader2 className="w-6 h-6 text-trago-orange animate-spin mt-2" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-trago-black">
      <header className="sticky top-0 z-20 glass-heavy">
        <div className="flex items-center gap-3 px-4 h-16">
          <button onClick={() => router.back()} aria-label="Volver" className="w-10 h-10 flex items-center justify-center text-white touch-manipulation -ml-1 rounded-xl hover:bg-white/5 transition-colors">
            <ArrowLeft className="w-5 h-5" />
          </button>
          <h1 className="text-xl font-display text-white tracking-tight">Confirmar pedido</h1>
        </div>
      </header>

      {/* Phone gate */}
      {state.phase === "phone" && (
        <div className="px-4 py-8 flex flex-col gap-5 max-w-sm mx-auto animate-fade-in">
          <div className="text-center">
            <div className="w-14 h-14 rounded-2xl bg-trago-orange/10 border border-trago-orange/20 flex items-center justify-center mx-auto mb-3">
              <Phone className="w-6 h-6 text-trago-orange" />
            </div>
            <p className="text-white font-display text-xl">Tu número de WhatsApp</p>
            <p className="text-zinc-500 text-sm mt-1">Te avisaremos cuando tu pedido esté listo</p>
          </div>

          <div className="space-y-2">
            <input
              type="tel"
              inputMode="numeric"
              placeholder="+56 9 XXXX XXXX"
              value={phoneInput}
              onChange={(e) => { setPhoneInput(e.target.value); setPhoneError(""); }}
              onKeyDown={(e) => e.key === "Enter" && handlePhoneContinue()}
              className="w-full h-14 bg-trago-card border border-trago-border rounded-2xl px-4 text-white text-lg placeholder-zinc-600 focus:outline-none focus:ring-2 focus:ring-trago-orange/40 focus:border-trago-orange/50 transition-all"
              autoFocus
            />
            {phoneError && <p className="text-red-400 text-sm px-1">{phoneError}</p>}
          </div>

          <button
            onClick={handlePhoneContinue}
            className="w-full h-14 bg-trago-orange text-white font-bold text-lg rounded-2xl touch-manipulation press-scale glow-orange"
          >
            Continuar al pago
          </button>

          <p className="text-zinc-600 text-xs text-center">
            Solo usaremos tu número para avisarte cuando tu pedido esté listo.
          </p>
        </div>
      )}

      {/* Creating */}
      {state.phase === "creating" && (
        <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4">
          <Loader2 className="w-8 h-8 text-trago-orange animate-spin" />
          <p className="text-trago-muted">Preparando tu pedido…</p>
        </div>
      )}

      {/* Ready — summary + payment */}
      {state.phase === "ready" && (
        <div className="px-4 py-4 pb-10 space-y-5">
          <div className="bg-trago-card rounded-2xl border border-trago-border overflow-hidden">
            {items.map((item, idx) => (
              <div key={item.product.id} className={["flex justify-between items-center px-4 py-3.5", idx < items.length - 1 ? "border-b border-trago-border" : ""].join(" ")}>
                <div>
                  <p className="text-white font-medium">{item.product.name}</p>
                  <p className="text-trago-muted text-sm">× {item.quantity}</p>
                </div>
                <p className="text-white font-semibold tabular-nums">{formatCLP(item.product.price_clp * item.quantity)}</p>
              </div>
            ))}
            <div className="flex justify-between items-center px-4 py-3 border-t border-trago-border bg-trago-dark/30">
              <span className="text-trago-muted font-medium">Total</span>
              <span className="text-white font-bold text-lg tabular-nums">{formatCLP(totalCLP)}</span>
            </div>
          </div>

          {orderNotes && (
            <div className="bg-trago-card rounded-xl px-4 py-3 border border-trago-border">
              <p className="text-trago-muted text-xs mb-1 font-medium uppercase tracking-wider">Notas</p>
              <p className="text-white text-sm">{orderNotes}</p>
            </div>
          )}

          <div>
            <p className="text-trago-muted text-sm text-center mb-3">Selecciona tu método de pago</p>
            {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
            {(() => { const W = Wallet as any; return (
              <W key={brickKey} initialization={{ preferenceId: state.preferenceId }} onSubmit={() => Promise.resolve()} onError={() => setBrickKey((k) => k + 1)} />
            ); })()}
            {process.env.NEXT_PUBLIC_MP_PUBLIC_KEY?.startsWith("TEST-") && (
              <button
                onClick={async () => {
                  await fetch(`/api/orders/${state.orderId}/test-pay`, { method: "POST" });
                  router.replace(`/${slug}/order/${state.orderId}`);
                }}
                className="mt-4 w-full h-12 border border-dashed border-zinc-600 text-zinc-400 hover:text-white hover:border-zinc-400 rounded-2xl text-sm font-medium transition-colors"
              >
                Pago de prueba (sin tarjeta)
              </button>
            )}
          </div>
        </div>
      )}

      {/* Unavailable */}
      {state.phase === "unavailable" && (
        <div className="px-4 py-8 flex flex-col gap-6 animate-fade-in">
          <div className="bg-trago-card rounded-2xl p-5 border border-trago-border">
            <p className="text-white font-display text-lg mb-3">Productos agotados</p>
            <ul className="space-y-2">
              {state.items.map((item) => (
                <li key={item.productId} className="text-white font-medium flex items-center gap-2">
                  <XCircle className="w-4 h-4 text-red-400 flex-shrink-0" />{item.name}
                </li>
              ))}
            </ul>
          </div>
          <button onClick={() => router.back()} className="w-full h-14 bg-trago-orange text-white font-bold rounded-2xl touch-manipulation press-scale glow-orange-sm">Volver al carrito</button>
        </div>
      )}

      {/* Price changed */}
      {state.phase === "price_changed" && (
        <div className="px-4 py-8 flex flex-col gap-6 animate-fade-in">
          <div className="bg-trago-card rounded-2xl p-5 border border-trago-border">
            <p className="text-white font-display text-lg mb-3">Precios actualizados</p>
            <ul className="space-y-3">
              {state.changes.map((c) => (
                <li key={c.productId} className="flex justify-between items-center">
                  <span className="text-white">{c.name}</span>
                  <span className="tabular-nums">
                    <span className="text-zinc-500 line-through text-sm mr-2">{formatCLP(c.oldPrice)}</span>
                    <span className="text-white font-semibold">{formatCLP(c.newPrice)}</span>
                  </span>
                </li>
              ))}
            </ul>
          </div>
          <button onClick={() => { const o = new Map(state.changes.map((c) => [c.productId, c.newPrice])); setPriceOverrides(o); submitted.current = false; submitOrder(o); }} className="w-full h-14 bg-trago-orange text-white font-bold rounded-2xl touch-manipulation press-scale glow-orange-sm">Aceptar y pagar</button>
          <button onClick={() => router.back()} className="w-full h-12 text-trago-muted font-medium touch-manipulation hover:text-white transition-colors">Volver al carrito</button>
        </div>
      )}

      {/* Error */}
      {state.phase === "error" && (
        <div className="px-4 py-8 flex flex-col items-center gap-6 text-center animate-fade-in">
          <AlertTriangle className="w-9 h-9 text-red-400" />
          <p className="text-white font-semibold text-lg">{state.message}</p>
          <button onClick={() => { submitted.current = false; submitOrder(priceOverrides); }} className="w-full h-14 bg-trago-orange text-white font-bold rounded-2xl touch-manipulation press-scale glow-orange-sm">Intentar nuevamente</button>
        </div>
      )}
    </div>
  );
}
