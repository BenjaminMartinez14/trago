"use client";

import { useEffect } from "react";
import { AlertTriangle, RotateCw } from "lucide-react";

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("[app error]", error);
  }, [error]);

  return (
    <div className="min-h-screen bg-trago-black flex flex-col items-center justify-center px-6 text-center gap-5">
      <div className="w-16 h-16 rounded-full bg-red-500/10 border border-red-500/20 flex items-center justify-center">
        <AlertTriangle className="w-7 h-7 text-red-400" />
      </div>
      <div>
        <h1 className="text-white font-display text-2xl mb-1">Algo salió mal</h1>
        <p className="text-trago-muted text-sm max-w-xs">
          Hubo un problema cargando esta página. Intenta de nuevo en unos segundos.
        </p>
      </div>
      <button
        onClick={reset}
        className="h-12 px-8 bg-trago-orange text-white font-bold rounded-xl touch-manipulation press-scale glow-orange-sm flex items-center gap-2"
      >
        <RotateCw className="w-4 h-4" /> Reintentar
      </button>
    </div>
  );
}
