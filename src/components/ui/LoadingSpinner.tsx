export default function LoadingSpinner({ className = "" }: { className?: string }) {
  return (
    <div
      className={`w-6 h-6 border-2 border-zinc-600 border-t-white rounded-full animate-spin ${className}`}
      role="status"
      aria-label="Cargando"
    />
  );
}
