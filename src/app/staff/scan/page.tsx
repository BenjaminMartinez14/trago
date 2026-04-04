"use client";

import { useState, useEffect } from "react";
import { CheckCircle2, AlertTriangle, Loader2 } from "lucide-react";
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
  | { phase: "loading_order" }
  | { phase: "order"; data: ScannedOrder; error?: string }
  | { phase: "transitioning"; data: ScannedOrder }
  | { phase: "done"; orderNumber: number }
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

  async function handleOpenOrder(orderId: string) {
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
        setState({ phase: "scan_error", message: "Entregado" });
        return;
      }
      if (data.order.status === "cancelled") {
        setState({ phase: "scan_error", message: "Este pedido fue cancelado" });
        return;
      }

      setState({ phase: "order", data });
    } catch {
      setState({ phase: "scan_error", message: "Error de conexión" });
    }
  }

  async function handleTransition(orderId: string, action: string) {
    if (!session || state.phase !== "order") return;
    const { data } = state;
    setState({ phase: "transitioning", data });

    const res = await fetch(`/api/staff/orders/${orderId}/transition`, {
      method: "PATCH",
      headers: { Authorization: `Bearer ${session.token}`, "Content-Type": "application/json" },
      body: JSON.stringify({ action }),
    });

    if (res.ok) {
      const { newStatus } = await res.json();
      if (newStatus === "delivered") {
        setState({ phase: "done", orderNumber: data.order.order_number });
        setTimeout(() => setState({ phase: "queue" }), 2000);
      } else {
        setState({ phase: "queue" });
      }
    } else {
      const body = await res.json().catch(() => ({}));
      setState({
        phase: "order", data,
        error: body.error === "INVALID_TRANSITION" ? `Estado ya cambió a "${body.currentStatus}"` : "Error al actualizar",
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


      {/* Body */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {state.phase === "queue" && session && (
          <OrderQueue
            token={session.token}
            venueId={session.venueId}
            onOpenOrder={(id) => handleOpenOrder(id)}
          />
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
            onTransition={handleTransition}
            onBack={() => setState({ phase: "queue" })}
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
