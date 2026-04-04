"use client";

import { useEffect, useRef, useCallback, useState } from "react";
import { Camera } from "lucide-react";

export default function ScannerView({ onScan }: { onScan: (orderId: string) => void }) {
  const scannerRef = useRef<InstanceType<typeof import("html5-qrcode").Html5Qrcode> | null>(null);
  const [cameraError, setCameraError] = useState(false);
  const scanning = useRef(false);

  const handleScanSuccess = useCallback(
    (decodedText: string) => {
      if (scanning.current) return;
      scanning.current = true;
      onScan(decodedText.trim());
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
        <div className="w-16 h-16 rounded-full bg-trago-card border border-trago-border flex items-center justify-center">
          <Camera className="w-7 h-7 text-trago-muted" />
        </div>
        <p className="text-white font-semibold">Sin acceso a la cámara</p>
        <p className="text-trago-muted text-sm">
          Permite el acceso a la cámara en la configuración de tu navegador y recarga la página.
        </p>
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col items-center justify-center gap-4 px-4">
      <p className="text-trago-muted text-sm">Apunta al QR del cliente</p>
      <div
        id="qr-reader"
        className="w-full max-w-sm rounded-2xl overflow-hidden bg-trago-card border border-trago-border"
        style={{ minHeight: 300 }}
      />
      <div className="flex items-center gap-2 text-trago-muted text-xs">
        <span className="w-2 h-2 bg-trago-green rounded-full animate-pulse-glow" />
        Escáner activo
      </div>
    </div>
  );
}
