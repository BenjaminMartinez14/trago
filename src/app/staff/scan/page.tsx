"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { createClient } from "@/lib/supabase/client";
import { formatCLP } from "@/lib/format";
import { ORDER_STATUS_LABELS } from "@/lib/constants";
import type { Order, OrderItem, OrderStatus } from "@/lib/supabase/types";

// ── Types ────────────────────────────────────────────────────────────────────

type StaffSession = {
  token: string;
  name: string;
  role: "scanner" | "admin";
  venueId: string;
};

type ScannedOrder = {
  order: Order;
  items: OrderItem[];
};

type NewOrderAlert = {
  id: string;
  orderNumber: number;
  totalCLP: number;
  seenAt: number;
};

type PageState =
  | { phase: "login" }
  | { phase: "scanning" }
  | { phase: "loading_order" }
  | { phase: "order"; data: ScannedOrder; error?: string }
  | { phase: "delivering" }
  | { phase: "done"; orderNumber: number }
  | { phase: "scan_error"; message: string };

const STAFF_SESSION_KEY = "trago_staff_session";
const PIN_LENGTH = 4;

// ── Sound alert ───────────────────────────────────────────────────────────────

function playBeep() {
  try {
    const ctx = new AudioContext();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.frequency.value = 880;
    gain.gain.setValueAtTime(0.3, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.4);
    osc.start();
    osc.stop(ctx.currentTime + 0.4);
  } catch {
    // AudioContext blocked — ignore
  }
}

// ── Main page ─────────────────────────────────────────────────────────────────

export default function StaffScanPage() {
  const [session, setSession] = useState<StaffSession | null>(null);
  const [state, setState] = useState<PageState>({ phase: "login" });
  const [newOrders, setNewOrders] = useState<NewOrderAlert[]>([]);

  // Load saved session on mount
  useEffect(() => {
    if (typeof window === "undefined") return;
    try {
      const raw = localStorage.getItem(STAFF_SESSION_KEY);
      if (raw) {
        const saved = JSON.parse(raw) as StaffSession;
        if (saved.token && saved.venueId) {
          setSession(saved);
          setState({ phase: "scanning" });
        }
      }
    } catch {
      // corrupt storage — ignore
    }
  }, []);

  // Realtime: subscribe to new paid orders for this venue
  useEffect(() => {
    if (!session) return;

    const supabase = createClient();
    const channel = supabase
      .channel(`new-orders-${session.venueId}`)
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "orders",
          filter: `venue_id=eq.${session.venueId}`,
        },
        (payload) => {
          const updated = payload.new as Order;
          if (updated.status === "paid") {
            playBeep();
            setNewOrders((prev) => {
              // deduplicate
              if (prev.some((o) => o.id === updated.id)) return prev;
              return [
                {
                  id: updated.id,
                  orderNumber: updated.order_number,
                  totalCLP: updated.total_clp,
                  seenAt: Date.now(),
                },
                ...prev.slice(0, 9), // keep last 10
              ];
            });
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [session]);

  function handleLoginSuccess(s: StaffSession) {
    localStorage.setItem(STAFF_SESSION_KEY, JSON.stringify(s));
    setSession(s);
    setState({ phase: "scanning" });
  }

  function handleLogout() {
    localStorage.removeItem(STAFF_SESSION_KEY);
    setSession(null);
    setNewOrders([]);
    setState({ phase: "login" });
  }

  async function handleScan(orderId: string) {
    if (!session || state.phase === "loading_order") return;
    setState({ phase: "loading_order" });

    try {
      const res = await fetch(`/api/staff/orders/${orderId}`, {
        headers: { Authorization: `Bearer ${session.token}` },
      });

      if (res.status === 404) {
        setState({ phase: "scan_error", message: "Pedido no encontrado" });
        return;
      }
      if (res.status === 403) {
        setState({ phase: "scan_error", message: "Este pedido no pertenece a este local" });
        return;
      }
      if (!res.ok) {
        setState({ phase: "scan_error", message: "Error al cargar el pedido" });
        return;
      }

      const data = (await res.json()) as ScannedOrder;

      if (data.order.status === "delivered") {
        setState({ phase: "scan_error", message: "Este pedido ya fue entregado" });
        return;
      }
      if (data.order.status === "cancelled") {
        setState({ phase: "scan_error", message: "Este pedido fue cancelado" });
        return;
      }

      setState({ phase: "order", data });
      // Dismiss from new orders list if present
      setNewOrders((prev) => prev.filter((o) => o.id !== orderId));
    } catch {
      setState({ phase: "scan_error", message: "Error de conexión" });
    }
  }

  async function handleDeliver(orderId: string) {
    if (!session) return;
    setState({ phase: "delivering" });

    const res = await fetch(`/api/staff/orders/${orderId}/deliver`, {
      method: "PATCH",
      headers: { Authorization: `Bearer ${session.token}` },
    });

    if (res.ok) {
      const orderNumber =
        state.phase === "delivering"
          ? 0
          : (state as { phase: "order"; data: ScannedOrder }).data?.order.order_number ?? 0;
      setState({ phase: "done", orderNumber });
      setTimeout(() => setState({ phase: "scanning" }), 2000);
    } else {
      const body = await res.json().catch(() => ({}));
      setState({
        phase: "order",
        data: (state as { data: ScannedOrder }).data,
        error:
          body.error === "ALREADY_DELIVERED"
            ? "Ya fue entregado"
            : "Error al marcar como entregado",
      });
    }
  }

  // ── Render ──────────────────────────────────────────────────────────────────

  if (state.phase === "login") {
    return <LoginView onSuccess={handleLoginSuccess} />;
  }

  return (
    <div className="min-h-screen bg-zinc-950 flex flex-col">
      {/* Header */}
      <header className="bg-zinc-900 border-b border-zinc-800 px-4 h-14 flex items-center justify-between flex-shrink-0">
        <div>
          <p className="text-white font-semibold text-sm">{session?.name}</p>
          <p className="text-zinc-500 text-xs capitalize">{session?.role}</p>
        </div>
        <button
          onClick={handleLogout}
          className="text-zinc-400 text-sm hover:text-white touch-manipulation"
        >
          Salir
        </button>
      </header>

      {/* New orders alerts */}
      {newOrders.length > 0 && (
        <div className="bg-yellow-500/10 border-b border-yellow-500/30 px-4 py-2 flex-shrink-0">
          <p className="text-yellow-400 text-xs font-semibold uppercase tracking-wide mb-1.5">
            🔔 Nuevos pedidos pagados ({newOrders.length})
          </p>
          <div className="flex gap-2 overflow-x-auto scrollbar-hide pb-1">
            {newOrders.map((o) => (
              <button
                key={o.id}
                onClick={() => handleScan(o.id)}
                className="flex-shrink-0 bg-yellow-500/20 border border-yellow-500/40 rounded-xl px-3 py-1.5 text-left touch-manipulation"
              >
                <p className="text-yellow-300 font-bold text-sm">#{o.orderNumber}</p>
                <p className="text-yellow-400/70 text-xs">{formatCLP(o.totalCLP)}</p>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Body */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {state.phase === "scanning" && (
          <ScannerView onScan={handleScan} />
        )}

        {state.phase === "loading_order" && (
          <div className="flex-1 flex items-center justify-center gap-3 flex-col">
            <div className="w-8 h-8 border-2 border-zinc-600 border-t-white rounded-full animate-spin" />
            <p className="text-zinc-400 text-sm">Cargando pedido…</p>
          </div>
        )}

        {state.phase === "scan_error" && (
          <div className="flex-1 flex flex-col items-center justify-center px-6 text-center gap-4">
            <span className="text-4xl" aria-hidden>⚠️</span>
            <p className="text-white font-semibold text-lg">{state.message}</p>
            <button
              onClick={() => setState({ phase: "scanning" })}
              className="h-12 px-8 bg-white text-black font-bold rounded-xl touch-manipulation"
            >
              Volver a escanear
            </button>
          </div>
        )}

        {state.phase === "order" && (
          <OrderView
            data={state.data}
            error={state.error}
            onDeliver={handleDeliver}
            onBack={() => setState({ phase: "scanning" })}
          />
        )}

        {state.phase === "delivering" && (
          <div className="flex-1 flex items-center justify-center gap-3 flex-col">
            <div className="w-8 h-8 border-2 border-zinc-600 border-t-white rounded-full animate-spin" />
            <p className="text-zinc-400 text-sm">Marcando como entregado…</p>
          </div>
        )}

        {state.phase === "done" && (
          <div className="flex-1 flex flex-col items-center justify-center gap-3 text-center">
            <span className="text-6xl" aria-hidden>✅</span>
            <p className="text-white font-bold text-2xl">¡Entregado!</p>
            <p className="text-zinc-400">Pedido #{state.orderNumber}</p>
          </div>
        )}
      </div>
    </div>
  );
}

// ── Login view ────────────────────────────────────────────────────────────────

function LoginView({ onSuccess }: { onSuccess: (s: StaffSession) => void }) {
  const [venueSlug, setVenueSlug] = useState("");
  const [pin, setPin] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  function handleKey(digit: string) {
    if (pin.length < PIN_LENGTH) setPin((p) => p + digit);
  }

  function handleDelete() {
    setPin((p) => p.slice(0, -1));
  }

  async function handleSubmit() {
    if (pin.length !== PIN_LENGTH || !venueSlug.trim()) return;
    setLoading(true);
    setError("");

    try {
      const res = await fetch("/api/staff/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ venueSlug: venueSlug.trim(), pin }),
      });

      if (res.status === 401) {
        setError("PIN o local incorrecto");
        setPin("");
        setLoading(false);
        return;
      }
      if (!res.ok) {
        setError("Error de servidor");
        setPin("");
        setLoading(false);
        return;
      }

      const data = await res.json();
      onSuccess(data as StaffSession);
    } catch {
      setError("Error de conexión");
      setPin("");
      setLoading(false);
    }
  }

  // Auto-submit when PIN is complete
  useEffect(() => {
    if (pin.length === PIN_LENGTH && venueSlug.trim()) {
      handleSubmit();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pin]);

  const keys = ["1", "2", "3", "4", "5", "6", "7", "8", "9", "", "0", "⌫"];

  return (
    <div className="min-h-screen bg-zinc-950 flex flex-col items-center justify-center px-6 gap-8">
      <div className="text-center">
        <p className="text-white font-bold text-2xl mb-1">Staff — Trago</p>
        <p className="text-zinc-400 text-sm">Ingresa con tu PIN</p>
      </div>

      {/* Venue slug */}
      <input
        type="text"
        value={venueSlug}
        onChange={(e) => setVenueSlug(e.target.value.toLowerCase().replace(/\s/g, "-"))}
        placeholder="Slug del local (ej: club-demo)"
        className="w-full max-w-xs bg-zinc-800 text-white placeholder-zinc-500 rounded-xl px-4 h-12 text-sm focus:outline-none focus:ring-2 focus:ring-white/20"
      />

      {/* PIN dots */}
      <div className="flex gap-4">
        {Array.from({ length: PIN_LENGTH }).map((_, i) => (
          <div
            key={i}
            className={`w-4 h-4 rounded-full border-2 transition-colors ${
              i < pin.length
                ? "bg-white border-white"
                : "border-zinc-600"
            }`}
          />
        ))}
      </div>

      {/* Error */}
      {error && <p className="text-red-400 text-sm">{error}</p>}

      {/* Numeric keypad */}
      <div className="grid grid-cols-3 gap-3 w-full max-w-xs">
        {keys.map((key, idx) => {
          if (key === "") return <div key={idx} />;
          if (key === "⌫") {
            return (
              <button
                key={idx}
                onClick={handleDelete}
                disabled={loading}
                className="h-16 bg-zinc-800 text-white text-2xl rounded-2xl flex items-center justify-center touch-manipulation active:bg-zinc-700 disabled:opacity-40"
              >
                ⌫
              </button>
            );
          }
          return (
            <button
              key={idx}
              onClick={() => handleKey(key)}
              disabled={loading || pin.length === PIN_LENGTH}
              className="h-16 bg-zinc-800 text-white text-2xl font-semibold rounded-2xl flex items-center justify-center touch-manipulation active:bg-zinc-700 disabled:opacity-40"
            >
              {loading && pin.length === PIN_LENGTH ? (
                <span className="w-5 h-5 border-2 border-zinc-500 border-t-white rounded-full animate-spin" />
              ) : (
                key
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}

// ── Scanner view ──────────────────────────────────────────────────────────────

function ScannerView({ onScan }: { onScan: (orderId: string) => void }) {
  const scannerRef = useRef<InstanceType<typeof import("html5-qrcode").Html5Qrcode> | null>(null);
  const [cameraError, setCameraError] = useState(false);
  const scanning = useRef(false);

  const handleScanSuccess = useCallback(
    (decodedText: string) => {
      if (scanning.current) return;
      scanning.current = true;
      // The QR encodes the order UUID directly
      const orderId = decodedText.trim();
      onScan(orderId);
    },
    [onScan]
  );

  useEffect(() => {
    if (typeof window === "undefined") return;

    let mounted = true;

    async function startScanner() {
      try {
        const { Html5Qrcode } = await import("html5-qrcode");
        const scanner = new Html5Qrcode("qr-reader");
        scannerRef.current = scanner;

        await scanner.start(
          { facingMode: "environment" },
          { fps: 10, qrbox: { width: 250, height: 250 } },
          (text) => {
            if (mounted) handleScanSuccess(text);
          },
          undefined
        );
      } catch {
        if (mounted) setCameraError(true);
      }
    }

    startScanner();

    return () => {
      mounted = false;
      scannerRef.current
        ?.stop()
        .catch(() => {})
        .finally(() => {
          scannerRef.current?.clear();
        });
    };
  }, [handleScanSuccess]);

  if (cameraError) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center px-6 text-center gap-4">
        <span className="text-4xl" aria-hidden>📷</span>
        <p className="text-white font-semibold">Sin acceso a la cámara</p>
        <p className="text-zinc-400 text-sm">
          Permite el acceso a la cámara en la configuración de tu navegador y recarga la página.
        </p>
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col items-center justify-center gap-4 px-4">
      <p className="text-zinc-400 text-sm">Apunta al QR del cliente</p>
      {/* html5-qrcode mounts inside this div */}
      <div
        id="qr-reader"
        className="w-full max-w-sm rounded-2xl overflow-hidden bg-zinc-900"
        style={{ minHeight: 300 }}
      />
      <div className="flex items-center gap-2 text-zinc-600 text-xs">
        <span className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
        Escáner activo
      </div>
    </div>
  );
}

// ── Order view ────────────────────────────────────────────────────────────────

function OrderView({
  data,
  error,
  onDeliver,
  onBack,
}: {
  data: ScannedOrder;
  error?: string;
  onDeliver: (id: string) => void;
  onBack: () => void;
}) {
  const { order, items } = data;
  const canDeliver = ["paid", "preparing", "ready"].includes(order.status);

  return (
    <div className="flex-1 flex flex-col overflow-hidden">
      {/* Back + order number */}
      <div className="px-4 pt-4 pb-2 flex items-center gap-3">
        <button
          onClick={onBack}
          className="text-zinc-400 text-xl touch-manipulation"
          aria-label="Volver"
        >
          ←
        </button>
        <div>
          <p className="text-white font-bold text-xl">Pedido #{order.order_number}</p>
          <p className="text-zinc-400 text-xs capitalize">
            {ORDER_STATUS_LABELS[order.status as OrderStatus]}
          </p>
        </div>
      </div>

      {/* Items list */}
      <div className="flex-1 overflow-y-auto px-4 pb-4 space-y-2">
        {items.map((item) => (
          <div
            key={item.id}
            className="flex justify-between items-center bg-zinc-900 rounded-xl px-4 py-3"
          >
            <div>
              <p className="text-white font-medium">{item.product_name}</p>
              {item.notes && (
                <p className="text-zinc-400 text-xs mt-0.5">{item.notes}</p>
              )}
            </div>
            <div className="text-right">
              <p className="text-white font-bold">×{item.quantity}</p>
              <p className="text-zinc-400 text-xs tabular-nums">
                {formatCLP(item.unit_price_clp * item.quantity)}
              </p>
            </div>
          </div>
        ))}

        {order.notes && (
          <div className="bg-zinc-900 rounded-xl px-4 py-3">
            <p className="text-zinc-400 text-xs mb-1">Nota del pedido</p>
            <p className="text-white text-sm">{order.notes}</p>
          </div>
        )}

        <div className="flex justify-between items-center px-1 pt-2">
          <span className="text-zinc-400">Total</span>
          <span className="text-white font-bold tabular-nums">{formatCLP(order.total_clp)}</span>
        </div>
      </div>

      {/* Deliver button */}
      <div className="px-4 pb-8 pt-2 flex-shrink-0">
        {error && (
          <p className="text-red-400 text-sm text-center mb-3">{error}</p>
        )}
        {canDeliver ? (
          <button
            onClick={() => onDeliver(order.id)}
            className="w-full h-16 bg-white text-black font-bold text-lg rounded-2xl touch-manipulation"
          >
            Marcar como entregado
          </button>
        ) : (
          <div className="w-full h-14 bg-zinc-800 rounded-2xl flex items-center justify-center">
            <p className="text-zinc-400 text-sm">
              Estado: {ORDER_STATUS_LABELS[order.status as OrderStatus]}
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
