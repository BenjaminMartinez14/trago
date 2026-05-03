"use client";

import { Suspense, useState, useEffect, useCallback, useRef } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { CheckCircle2, AlertTriangle, Loader2, MapPin, ChevronRight, X, Camera } from "lucide-react";
import LoginView from "./_components/login-view";
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

type Station = {
  id: string;
  name: string;
  slug: string;
};

type PageState =
  | { phase: "login" }
  | { phase: "station_select" }
  | { phase: "queue" }
  | { phase: "scanning" }
  | { phase: "loading_order" }
  | { phase: "order"; data: ScannedOrder; error?: string }
  | { phase: "transitioning"; data: ScannedOrder }
  | { phase: "done"; orderNumber: number }
  | { phase: "scan_error"; message: string };

const STAFF_SESSION_KEY = "trago_staff_session";
const STAFF_STATION_KEY = "trago_staff_station";

// ── Helpers ──────────────────────────────────────────────────────────────────

function isTokenExpired(token: string): boolean {
  try {
    const payload = JSON.parse(atob(token.split(".")[1]));
    return payload.exp * 1000 < Date.now();
  } catch {
    return true;
  }
}

// ── Queue scanner view ────────────────────────────────────────────────────────

function QueueScannerView({
  onScan,
  onCancel,
}: {
  onScan: (text: string) => void;
  onCancel: () => void;
}) {
  const scannerRef = useRef<InstanceType<typeof import("html5-qrcode").Html5Qrcode> | null>(null);
  const [cameraError, setCameraError] = useState(false);
  const handled = useRef(false);

  const handleResult = useCallback(
    (text: string) => {
      if (handled.current) return;
      handled.current = true;
      onScan(text.trim());
    },
    [onScan]
  );

  useEffect(() => {
    if (typeof window === "undefined") return;
    let mounted = true;

    async function start() {
      try {
        const { Html5Qrcode } = await import("html5-qrcode");
        const scanner = new Html5Qrcode("queue-qr-reader");
        scannerRef.current = scanner;
        await scanner.start(
          { facingMode: "environment" },
          { fps: 10, qrbox: { width: 220, height: 220 } },
          (text) => { if (mounted) handleResult(text); },
          undefined
        );
      } catch {
        if (mounted) setCameraError(true);
      }
    }

    start();

    return () => {
      mounted = false;
      scannerRef.current?.stop().catch(() => {}).finally(() => scannerRef.current?.clear());
    };
  }, [handleResult]);

  return (
    <div className="flex-1 flex flex-col px-4 py-6 gap-4">
      <div className="text-center">
        <p className="text-white font-display text-xl">Escanear QR del cliente</p>
        <p className="text-zinc-500 text-sm mt-1">Apunta la cámara al QR del cliente</p>
      </div>

      {cameraError ? (
        <div className="flex flex-col items-center gap-3 py-8 text-center">
          <Camera className="w-8 h-8 text-trago-muted" />
          <p className="text-white text-sm font-medium">Sin acceso a la cámara</p>
          <button onClick={onCancel} className="text-zinc-400 text-sm underline">Cancelar</button>
        </div>
      ) : (
        <>
          <div
            id="queue-qr-reader"
            className="w-full rounded-2xl overflow-hidden bg-trago-card border border-trago-border"
            style={{ minHeight: 260 }}
          />
          <button
            onClick={onCancel}
            className="flex items-center justify-center gap-1.5 text-zinc-400 text-sm hover:text-white transition-colors touch-manipulation"
          >
            <X className="w-4 h-4" /> Cancelar
          </button>
        </>
      )}
    </div>
  );
}

// ── Station selector view ─────────────────────────────────────────────────────

function StationSelectView({
  token,
  onSelect,
}: {
  token: string;
  onSelect: (station: Station | null) => void;
}) {
  const [stations, setStations] = useState<Station[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/staff/stations", {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then((r) => r.json())
      .then((d) => setStations(d.stations ?? []))
      .finally(() => setLoading(false));
  }, [token]);

  if (loading) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <Loader2 className="w-8 h-8 text-trago-orange animate-spin" />
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col px-4 py-8 gap-4">
      <div className="text-center mb-2">
        <MapPin className="w-8 h-8 text-trago-orange mx-auto mb-2" />
        <p className="text-white font-display text-xl">Seleccionar estación</p>
        <p className="text-zinc-500 text-sm mt-1">¿Desde qué barra estás atendiendo?</p>
      </div>

      <div className="space-y-2">
        {stations.map((s) => (
          <button
            key={s.id}
            onClick={() => onSelect(s)}
            className="w-full flex items-center justify-between bg-trago-card border border-trago-border rounded-2xl px-5 py-4 text-white hover:border-trago-orange/50 hover:bg-trago-orange/5 transition-all active:scale-95 touch-manipulation"
          >
            <span className="font-semibold text-base">{s.name}</span>
            <ChevronRight className="w-5 h-5 text-trago-orange" />
          </button>
        ))}

        {stations.length > 1 && (
          <button
            onClick={() => onSelect(null)}
            className="w-full flex items-center justify-between bg-trago-card border border-zinc-700 rounded-2xl px-5 py-4 text-zinc-400 hover:text-white hover:border-zinc-500 transition-all active:scale-95 touch-manipulation"
          >
            <span className="font-medium text-sm">Ver todos los pedidos</span>
            <ChevronRight className="w-4 h-4" />
          </button>
        )}

        {stations.length === 0 && (
          <p className="text-zinc-500 text-center py-8">No hay estaciones activas</p>
        )}
      </div>
    </div>
  );
}

// ── Main page ────────────────────────────────────────────────────────────────

export default function StaffScanPage() {
  return (
    <Suspense>
      <StaffScanPageInner />
    </Suspense>
  );
}

function StaffScanPageInner() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [session, setSession] = useState<StaffSession | null>(null);
  const [state, setState] = useState<PageState>({ phase: "login" });
  const [selectedStation, setSelectedStation] = useState<Station | null | undefined>(undefined);

  const buildUrl = useCallback((extra?: Record<string, string>) => {
    const params = new URLSearchParams();
    const stationId = selectedStation === undefined
      ? null
      : selectedStation
        ? selectedStation.id
        : "all";
    if (stationId) params.set("station", stationId);
    if (extra) Object.entries(extra).forEach(([k, v]) => params.set(k, v));
    const qs = params.toString();
    return qs ? `/staff/scan?${qs}` : "/staff/scan";
  }, [selectedStation]);

  useEffect(() => {
    const orderId = searchParams.get("order");
    if (orderId && session && state.phase === "queue") {
      handleOpenOrder(orderId, false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [session]);

  useEffect(() => {
    if (typeof window === "undefined") return;
    try {
      const raw = localStorage.getItem(STAFF_SESSION_KEY);
      if (raw) {
        const saved = JSON.parse(raw) as StaffSession;
        if (saved.token && saved.venueId && !isTokenExpired(saved.token)) {
          setSession(saved);

          const stationParam = searchParams.get("station");
          const savedStationRaw = localStorage.getItem(STAFF_STATION_KEY);
          const savedStation = savedStationRaw ? JSON.parse(savedStationRaw) as Station : null;

          if (stationParam === "all") {
            setSelectedStation(null);
            setState({ phase: "queue" });
          } else if (stationParam && savedStation && savedStation.id === stationParam) {
            setSelectedStation(savedStation);
            setState({ phase: "queue" });
          } else if (stationParam && savedStation && savedStation.id !== stationParam) {
            setState({ phase: "station_select" });
          } else if (!stationParam && savedStation) {
            setSelectedStation(savedStation);
            setState({ phase: "queue" });
            router.replace(`/staff/scan?station=${savedStation.id}`);
          } else {
            setState({ phase: "station_select" });
          }
          return;
        } else {
          localStorage.removeItem(STAFF_SESSION_KEY);
          localStorage.removeItem(STAFF_STATION_KEY);
        }
      }
    } catch {
      // corrupt storage
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function handleLoginSuccess(s: StaffSession) {
    localStorage.setItem(STAFF_SESSION_KEY, JSON.stringify(s));
    setSession(s);
    setState({ phase: "station_select" });
  }

  function handleStationSelect(station: Station | null) {
    setSelectedStation(station);
    if (station) {
      localStorage.setItem(STAFF_STATION_KEY, JSON.stringify(station));
      router.replace(`/staff/scan?station=${station.id}`);
    } else {
      localStorage.removeItem(STAFF_STATION_KEY);
      router.replace("/staff/scan?station=all");
    }
    setState({ phase: "queue" });
  }

  function handleLogout() {
    localStorage.removeItem(STAFF_SESSION_KEY);
    localStorage.removeItem(STAFF_STATION_KEY);
    setSession(null);
    setSelectedStation(undefined);
    setState({ phase: "login" });
  }

  const handleOpenOrder = useCallback(async (orderId: string, updateUrl = true) => {
    if (!session) return;
    setState({ phase: "loading_order" });
    if (updateUrl) router.push(buildUrl({ order: orderId }));

    try {
      const res = await fetch(`/api/staff/orders/${orderId}`, {
        headers: { Authorization: `Bearer ${session.token}` },
      });

      if (res.status === 404) {
        setState({ phase: "scan_error", message: "Pedido no encontrado" });
        router.replace(buildUrl());
        return;
      }
      if (res.status === 403) {
        setState({ phase: "scan_error", message: "Este pedido no pertenece a este local" });
        router.replace(buildUrl());
        return;
      }
      if (!res.ok) {
        setState({ phase: "scan_error", message: "Error al cargar el pedido" });
        router.replace(buildUrl());
        return;
      }

      const data = (await res.json()) as ScannedOrder;

      if (data.order.status === "delivered") {
        setState({ phase: "scan_error", message: "Entregado" });
        router.replace(buildUrl());
        return;
      }
      if (data.order.status === "cancelled") {
        setState({ phase: "scan_error", message: "Este pedido fue cancelado" });
        router.replace(buildUrl());
        return;
      }

      setState({ phase: "order", data });
    } catch {
      setState({ phase: "scan_error", message: "Error de conexión" });
      router.replace(buildUrl());
    }
  }, [session, router, buildUrl]);

  const handleScanQR = useCallback(async (orderUUID: string) => {
    if (!session) return;
    setState({ phase: "loading_order" });

    try {
      const transRes = await fetch(`/api/staff/orders/${orderUUID}/transition`, {
        method: "PATCH",
        headers: { Authorization: `Bearer ${session.token}`, "Content-Type": "application/json" },
        body: JSON.stringify({ action: "scan", stationId: selectedStation?.id ?? null }),
      });

      if (transRes.status === 404) {
        setState({ phase: "scan_error", message: "Pedido no encontrado" });
        return;
      }
      if (transRes.status === 403) {
        setState({ phase: "scan_error", message: "Este pedido no pertenece a este local" });
        return;
      }
      if (transRes.status === 409) {
        const body = await transRes.json().catch(() => ({}));
        if (body.error === "INVALID_TRANSITION") {
          setState({ phase: "scan_error", message: "Este pedido ya está en preparación o fue entregado" });
        } else {
          setState({ phase: "scan_error", message: "No se pudo procesar el pedido" });
        }
        return;
      }
      if (!transRes.ok) {
        setState({ phase: "scan_error", message: "Error al procesar el pedido" });
        return;
      }

      // Fetch full order details to show in order view
      const orderRes = await fetch(`/api/staff/orders/${orderUUID}`, {
        headers: { Authorization: `Bearer ${session.token}` },
      });
      if (!orderRes.ok) {
        setState({ phase: "scan_error", message: "Error al cargar el pedido" });
        return;
      }

      const data = (await orderRes.json()) as ScannedOrder;
      setState({ phase: "order", data });
    } catch {
      setState({ phase: "scan_error", message: "Error de conexión" });
    }
  }, [session, selectedStation]);

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
      router.replace(buildUrl());
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
          <button
            onClick={() => { router.replace("/staff/scan"); setState({ phase: "station_select" }); }}
            className="text-trago-orange text-xs hover:text-trago-orange/80 transition-colors text-left"
          >
            {selectedStation ? selectedStation.name : "Todos los pedidos"} ›
          </button>
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
        {state.phase === "station_select" && session && (
          <StationSelectView token={session.token} onSelect={handleStationSelect} />
        )}

        {state.phase === "queue" && session && (
          <OrderQueue
            token={session.token}
            venueId={session.venueId}
            stationId={selectedStation?.id ?? null}
            onOpenOrder={(id) => handleOpenOrder(id)}
            onScanQR={() => setState({ phase: "scanning" })}
          />
        )}

        {state.phase === "scanning" && (
          <QueueScannerView
            onScan={handleScanQR}
            onCancel={() => setState({ phase: "queue" })}
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
              onClick={() => { router.replace(buildUrl()); setState({ phase: "queue" }); }}
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
            onBack={() => { router.replace("/staff/scan"); setState({ phase: "queue" }); }}
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
