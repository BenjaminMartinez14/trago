import Link from "next/link";
import { Wine, LayoutDashboard, ScanLine } from "lucide-react";

export default function Home() {
  return (
    <div className="min-h-screen bg-trago-black flex flex-col items-center justify-center px-4 gap-8">
      <div className="text-center">
        <h1 className="text-4xl font-display text-trago-orange text-glow-orange">Trago</h1>
        <p className="text-trago-muted text-sm mt-2">Ordena y paga desde tu celular</p>
      </div>

      <div className="w-full max-w-xs space-y-3">
        <Link
          href="/club-demo"
          className="flex items-center gap-3 w-full h-14 bg-trago-orange text-white font-semibold rounded-2xl px-5 glow-orange press-scale touch-manipulation"
        >
          <Wine className="w-5 h-5" />
          Demo cliente (menú)
        </Link>

        <Link
          href="/dashboard"
          className="flex items-center gap-3 w-full h-14 bg-trago-card text-white font-semibold rounded-2xl px-5 border border-trago-border press-scale touch-manipulation hover:bg-trago-card-hover transition-colors"
        >
          <LayoutDashboard className="w-5 h-5" />
          Admin dashboard
        </Link>

        <Link
          href="/staff/scan"
          className="flex items-center gap-3 w-full h-14 bg-trago-card text-white font-semibold rounded-2xl px-5 border border-trago-border press-scale touch-manipulation hover:bg-trago-card-hover transition-colors"
        >
          <ScanLine className="w-5 h-5" />
          Staff scanner
        </Link>
      </div>

      <p className="text-zinc-600 text-xs">Dev navigation — not for production</p>
    </div>
  );
}
