export default function OfflinePage() {
  return (
    <div className="min-h-screen bg-black flex flex-col items-center justify-center px-4 text-center">
      <span className="text-5xl mb-4" aria-hidden>📶</span>
      <h1 className="text-2xl font-bold text-white mb-2">Sin conexión</h1>
      <p className="text-zinc-400 text-base max-w-xs">
        Conecta a la red e intenta nuevamente. Tu pedido está guardado.
      </p>
    </div>
  );
}
