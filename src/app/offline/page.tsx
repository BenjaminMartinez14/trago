import { WifiOff } from "lucide-react";

export default function OfflinePage() {
  return (
    <div className="min-h-screen bg-trago-black flex flex-col items-center justify-center px-4 text-center">
      <div className="w-20 h-20 rounded-full bg-trago-card border border-trago-border flex items-center justify-center mb-6">
        <WifiOff className="w-9 h-9 text-trago-orange" />
      </div>
      <h1 className="text-2xl font-display text-white mb-2">Sin conexión</h1>
      <p className="text-trago-muted text-base max-w-xs">
        Conecta a la red e intenta nuevamente. Tu pedido está guardado.
      </p>
    </div>
  );
}
