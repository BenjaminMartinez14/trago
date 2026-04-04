"use client";

import { useState, useEffect } from "react";
import { CheckCircle2, AlertTriangle, Loader2, List, ScanLine } from "lucide-react";
import { formatCLP } from "@/lib/format";
import LoginView from "./_components/login-view";
import ScannerView from "./_components/scanner-view";
import OrderView from "./_components/order-view";
import OrderQueue from "./_components/order-queue";
import type { Order, OrderItem } from "@/lib/supabase/types";

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

type PageState =
  | { phase: "login" }
  | { phase: "queue" }
  | { phase: "scanner" }
  | { phase: "loading_order" }
  | { phase: "order"; data: ScannedOrder; returnTo: "queue" | "scanner"; error?: string }
  | { phase: "transitioning"; data: ScannedOrder; returnTo: "queue" | "scanner" }
  | { phase: "done"; orderNumber: number; returnTo: "queue" | "scanner" }
  | { phase: "scan_error"; message: string };

const STAFF_SESSION_KEY = "trago_staff_session";

// ── Helpers ──────────────────────────────────────────────────────────────────

function isTokenExpired(token: string): boolean {
  try {
    const payload = JSON.parse(atob(token.split(".")[1]));
    return payload.exp * 1000 < Date.now();
  } catch {
    return true;
  }
}

// ── Main page ────────────────────────────────────────────────────────────────

export default function StaffScanPage() {
  const [session, setSession] = useState<StaffSession | null>(null);
  const [state, setState] = useState<PageState>({ phase: "login" });

  // Track active tab for badge / return
  const activeTab = state.phase === "scanner" ? "scanner" : "queue";

  // Load saved session on mount (with JWT expiry check)
  useEffect(() => {
    if (typeof window === "undefined") return;
    try {
      const raw = localStorage.getItem(STAFF_SESSION_KEY);
      if (raw) {
        const saved = JSON.parse(raw) as StaffSession;
        if (saved.token && saved.venueId && !isTokenExpired(saved.token)) {
          setSession(saved);
          setState({ phase: "queue" });
        } else {
          localStorage.removeItem(STAFF_SESSION_KEY);
        }
      }
    } catch {
      // corrupt storage
    }
  }, []);

  function handleLoginSuccess(s: StaffSession) {
    localStorage.setItem(STAFF_SESSION_KEY, JSON.stringify(s));
    setSession(s);
    setState({ phase: "queue" });
  }

  function handleLogout() {
    localStorage.removeItem(STAFF_SESSION_KEY);
    setSession(null);
    setState({ phase: "login" });
  }

  async function handleOpenOrder(orderId: string, returnTo: "queue" | "scanner" = "queue") {
    if (!session) return;
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

      setState({ phase: "order", data, returnTo });
    } catch {
      setState({ phase: "scan_error", message: "Error de conexión" });
    }
  }

  async function handleTransition(orderId: string, action: string) {
    if (!session || state.phase !== "order") return;
    const { data, returnTo } = state;
    setState({ phase: "transitioning", data, returnTo });

    const res = await fetch(`/api/staff/orders/${orderId}/transition`, {
      method: "PATCH",
      headers: {
        Authorization: `Bearer ${session.token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ action }),
    });

    if (res.ok) {
      const { newStatus } = await res.json();
      if (newStatus === "delivered") {
        setState({ phase: "done", orderNumber: data.order.order_number, returnTo });
        setTimeout(() => setState({ phase: returnTo }), 2000);
      } else {
        // Status advanced — go back to the return view
        setState({ phase: returnTo });
      }
    } else {
      const body = await res.json().catch(() => ({}));
      setState({
        phase: "order",
        data,
        returnTo,
        error:
          body.error === "INVALID_TRANSITION"
            ? `Estado ya cambió a "${body.currentStatus}"`
            : "Error al actualizar",
      });
    }
  }

  // ── Render ────────────────────────────────────────────────────────────────

  if (state.phase === "login") {
    return <LoginView onSuccess={handleLoginSuccess} />;
  }

  return (
    <div className="min-h-screen bg-trago-black flex flex-col">
      {/* Header */}
      <header className="glass-heavy px-4 h-14 flex items-center justify-between flex-shrink-0">
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

      {/* Tab bar */}
      <div className="flex border-b border-trago-border flex-shrink-0">
        <button
          onClick={() => setState({ phase: "queue" })}
          className={`flex-1 h-12 flex items-center justify-center gap-2 text-sm font-medium touch-manipulation transition-colors ${
            activeTab === "queue"
              ? "text-trago-orange border-b-2 border-trago-orange"
              : "text-zinc-500"
          }`}
        >
          <List className="w-4 h-4" />
          Cola
        </button>
        <button
          onClick={() => setState({ phase: "scanner" })}
          className={`flex-1 h-12 flex items-center justify-center gap-2 text-sm font-medium touch-manipulation transition-colors ${
            activeTab === "scanner"
              ? "text-trago-orange border-b-2 border-trago-orange"
              : "text-zinc-500"
          }`}
        >
          <ScanLine className="w-4 h-4" />
          Escanear
        </button>
      </div>

      {/* Body */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {state.phase === "queue" && session && (
          <OrderQueue
            token={session.token}
            venueId={session.venueId}
            onOpenOrder={(id) => handleOpenOrder(id, "queue")}
          />
        )}

        {state.phase === "scanner" && (
          <ScannerView onScan={(id) => handleOpenOrder(id, "scanner")} />
        )}

        {state.phase === "loading_order" && (
          <div className="flex-1 flex items-center justify-center gap-3 flex-col">
            <Loader2 className="w-8 h-8 text-trago-orange animate-spin" />
            <p className="text-trago-muted text-sm">Cargando pedido…</p>
          </div>
        )}

        {state.phase === "scan_error" && (
          <div className="flex-1 flex flex-col items-center justify-center px-6 text-center gap-4">
            <div className="w-16 h-16 rounded-full bg-red-500/10 border border-red-500/20 flex items-center justify-center">
              <AlertTriangle className="w-7 h-7 text-red-400" />
            </div>
            <p className="text-white font-semibold text-lg">{state.message}</p>
            <button
              onClick={() => setState({ phase: "queue" })}
              className="h-12 px-8 bg-trago-orange text-white font-bold rounded-xl touch-manipulation press-scale glow-orange-sm"
            >
              Volver
            </button>
          </div>
        )}

        {(state.phase === "order" || state.phase === "transitioning") && (
          <OrderView
            data={state.data}
            error={state.phase === "order" ? state.error : undefined}
            transitioning={state.phase === "transitioning"}
            scannerMode={state.returnTo === "scanner"}
            onTransition={handleTransition}
            onBack={() => setState({ phase: state.returnTo })}
          />
        )}

        {state.phase === "done" && (
          <div className="flex-1 flex flex-col items-center justify-center gap-3 text-center animate-fade-in">
            <div className="w-20 h-20 rounded-full bg-trago-green/10 border border-trago-green/20 flex items-center justify-center">
              <CheckCircle2 className="w-10 h-10 text-trago-green" />
            </div>
            <p className="text-white font-display text-2xl">¡Entregado!</p>
            <p className="text-trago-muted">Pedido #{state.orderNumber}</p>
          </div>
        )}
      </div>
    </div>
  );
}
