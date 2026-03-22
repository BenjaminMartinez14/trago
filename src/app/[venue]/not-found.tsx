import { SearchX } from "lucide-react";

export default function VenueNotFound() {
  return (
    <div className="min-h-screen bg-trago-black flex flex-col items-center justify-center px-4 text-center">
      <div className="w-20 h-20 rounded-full bg-trago-card border border-trago-border flex items-center justify-center mb-6">
        <SearchX className="w-9 h-9 text-trago-muted" />
      </div>
      <h1 className="text-2xl font-display text-white mb-2">Venue no encontrado</h1>
      <p className="text-trago-muted text-base">
        Verifica el código QR e intenta nuevamente.
      </p>
    </div>
  );
}
