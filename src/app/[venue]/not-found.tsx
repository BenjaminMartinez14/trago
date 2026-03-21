export default function VenueNotFound() {
  return (
    <div className="min-h-screen bg-black flex flex-col items-center justify-center px-4 text-center">
      <span className="text-5xl mb-4" aria-hidden>🍹</span>
      <h1 className="text-2xl font-bold text-white mb-2">Venue no encontrado</h1>
      <p className="text-zinc-400 text-base">
        Verifica el código QR e intenta nuevamente.
      </p>
    </div>
  );
}
