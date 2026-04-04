"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { ArrowLeft, ScanLine, X, Camera } from "lucide-react";
import { formatCLP } from "@/lib/format";
import { ORDER_STATUS_LABELS, STAFF_STATUS_TRANSITIONS } from "@/lib/constants";
import type { Order, OrderItem, OrderStatus } from "@/lib/supabase/types";

type ScannedOrder = {
  order: Order;
  items: OrderItem[];
};

// ── Inline QR scanner ────────────────────────────────────────────────────────

function InlineScanner({
  expectedId,
  onMatch,
  onMismatch,
  onCancel,
}: {
  expectedId: string;
  onMatch: () => void;
  onMismatch: () => void;
  onCancel: () => void;
}) {
  const scannerRef = useRef<InstanceType<typeof import("html5-qrcode").Html5Qrcode> | null>(null);
  const [cameraError, setCameraError] = useState(false);
  const handled = useRef(false);

  const handleScan = useCallback(
    (text: string) => {
      if (handled.current) return;
      handled.current = true;
      if (text.trim() === expectedId) {
        onMatch();
      } else {
        onMismatch();
      }
    },
    [expectedId, onMatch, onMismatch]
  );

  useEffect(() => {
    if (typeof window === "undefined") return;
    let mounted = true;

    async function start() {
      try {
        const { Html5Qrcode } = await import("html5-qrcode");
        const scanner = new Html5Qrcode("inline-qr-reader");
        scannerRef.current = scanner;
        await scanner.start(
          { facingMode: "environment" },
          { fps: 10, qrbox: { width: 220, height: 220 } },
          (text) => { if (mounted) handleScan(text); },
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
  }, [handleScan]);

  if (cameraError) {
    return (
      <div className="flex flex-col items-center gap-3 py-6 text-center">
        <Camera className="w-8 h-8 text-trago-muted" />
        <p className="text-white text-sm font-medium">Sin acceso a la cámara</p>
        <button onClick={onCancel} className="text-zinc-400 text-sm underline">Cancelar</button>
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center gap-3">
      <p className="text-trago-muted text-sm">Apunta al QR del cliente</p>
      <div
        id="inline-qr-reader"
        className="w-full rounded-2xl overflow-hidden bg-trago-card border border-trago-border"
        style={{ minHeight: 260 }}
      />
      <button
        onClick={onCancel}
        className="flex items-center gap-1.5 text-zinc-400 text-sm hover:text-white transition-colors"
      >
        <X className="w-4 h-4" /> Cancelar escaneo
      </button>
    </div>
  );
}

// ── Order view ────────────────────────────────────────────────────────────────

export default function OrderView({
  data,
  error,
  transitioning,
  onTransition,
  onBack,
}: {
  data: ScannedOrder;
  error?: string;
  transitioning?: boolean;
  onTransition: (orderId: string, action: string) => void;
  onBack: () => void;
}) {
  const { order, items } = data;
  const transition = STAFF_STATUS_TRANSITIONS[order.status];

  const [scanning, setScanning] = useState(false);
  const [scanError, setScanError] = useState("");

  const isReady = order.status === "ready";

  return (
    <div className="flex-1 flex flex-col overflow-hidden">
      {/* Back + order number */}
      <div className="px-4 pt-4 pb-2 flex items-center gap-3">
        <button
          onClick={onBack}
          className="w-10 h-10 flex items-center justify-center text-white touch-manipulation rounded-xl hover:bg-white/5 transition-colors -ml-1"
          aria-label="Volver"
        >
          <ArrowLeft className="w-5 h-5" />
        </button>
        <div>
          <p className="text-white font-display text-xl">Pedido #{order.order_number}</p>
          <p className="text-trago-muted text-xs capitalize">
            {ORDER_STATUS_LABELS[order.status as OrderStatus]}
          </p>
        </div>
      </div>

      {/* Items list */}
      <div className="flex-1 overflow-y-auto px-4 pb-4 space-y-2">
        {items.map((item) => (
          <div
            key={item.id}
            className="flex justify-between items-center bg-trago-card rounded-xl px-4 py-3 border border-trago-border"
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
          <div className="bg-trago-card rounded-xl px-4 py-3 border border-trago-border">
            <p className="text-trago-muted text-xs mb-1">Nota del pedido</p>
            <p className="text-white text-sm">{order.notes}</p>
          </div>
        )}

        <div className="flex justify-between items-center px-1 pt-2">
          <span className="text-zinc-400">Total</span>
          <span className="text-white font-bold tabular-nums">{formatCLP(order.total_clp)}</span>
        </div>

        {/* Inline scanner — only when ready */}
        {isReady && scanning && (
          <div className="mt-2">
            <InlineScanner
              expectedId={order.id}
              onMatch={() => {
                setScanning(false);
                setScanError("");
                onTransition(order.id, "deliver");
              }}
              onMismatch={() => {
                setScanning(false);
                setScanError("El QR no corresponde a este pedido");
              }}
              onCancel={() => {
                setScanning(false);
                setScanError("");
              }}
            />
          </div>
        )}
      </div>

      {/* Action button */}
      <div className="px-4 pb-8 pt-2 flex-shrink-0 space-y-2">
        {(error || scanError) && (
          <p className="text-red-400 text-sm text-center">{error || scanError}</p>
        )}

        {isReady ? (
          !scanning && (
            <button
              onClick={() => { setScanError(""); setScanning(true); }}
              disabled={transitioning}
              className="w-full h-16 bg-trago-green text-white font-bold text-lg rounded-2xl touch-manipulation press-scale disabled:opacity-50 flex items-center justify-center gap-2"
            >
              <ScanLine className="w-5 h-5" />
              Escanear QR para entregar
            </button>
          )
        ) : transition ? (
          <button
            onClick={() => onTransition(order.id, transition.action)}
            disabled={transitioning}
            className={`w-full h-16 ${transition.color} text-white font-bold text-lg rounded-2xl touch-manipulation press-scale disabled:opacity-50`}
          >
            {transitioning ? "Actualizando…" : transition.label}
          </button>
        ) : (
          <div className="w-full h-14 bg-trago-card rounded-2xl flex items-center justify-center border border-trago-border">
            <p className="text-trago-muted text-sm">
              {ORDER_STATUS_LABELS[order.status as OrderStatus]}
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
