"use client";

import Link from "next/link";
import { useRouter, useParams } from "next/navigation";
import { ArrowLeft, ShoppingBag, ChevronRight } from "lucide-react";
import { useCart } from "@/hooks/useCart";
import CartItemRow from "@/components/menu/CartItemRow";
import { formatCLP } from "@/lib/format";

export default function CartPage() {
  const router = useRouter();
  const params = useParams<{ venue: string }>();
  const { items, totalCLP, orderNotes, setOrderNotes } = useCart();
  const slug = params.venue;

  return (
    <div className="min-h-screen bg-trago-black flex flex-col">
      {/* Header */}
      <header className="sticky top-0 z-20 glass-heavy">
        <div className="flex items-center gap-3 px-4 h-16">
          <button
            onClick={() => router.back()}
            aria-label="Volver al menú"
            className="w-10 h-10 flex items-center justify-center text-white touch-manipulation -ml-1 rounded-xl hover:bg-white/5 transition-colors"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <h1 className="text-xl font-display text-white tracking-tight">Mi pedido</h1>
        </div>
      </header>

      {items.length === 0 ? (
        /* Empty state */
        <div className="flex-1 flex flex-col items-center justify-center px-4 text-center gap-4">
          <div className="w-20 h-20 rounded-full bg-trago-card border border-trago-border flex items-center justify-center">
            <ShoppingBag className="w-9 h-9 text-zinc-500" />
          </div>
          <p className="text-white font-semibold text-lg">Tu pedido está vacío</p>
          <p className="text-trago-muted text-sm">Agrega productos desde el menú</p>
          <Link
            href={`/${slug}`}
            className="mt-2 h-12 px-6 bg-trago-orange text-white font-semibold rounded-xl flex items-center touch-manipulation press-scale glow-orange-sm"
          >
            Ver menú
          </Link>
        </div>
      ) : (
        <>
          {/* Item list */}
          <main className="flex-1 px-4 py-4 space-y-3 pb-48">
            {items.map((item) => (
              <CartItemRow key={item.product.id} item={item} />
            ))}

            {/* Order notes */}
            <div className="bg-trago-card rounded-2xl p-4 mt-2 border border-trago-border">
              <label
                htmlFor="order-notes"
                className="block text-trago-muted text-sm font-medium mb-2"
              >
                Notas del pedido (opcional)
              </label>
              <textarea
                id="order-notes"
                value={orderNotes}
                onChange={(e) => setOrderNotes(e.target.value)}
                placeholder="Ej: sin hielo, sin gas…"
                rows={3}
                className="w-full bg-trago-dark text-white placeholder-zinc-600 rounded-xl px-4 py-3 text-sm resize-none border border-trago-border focus:outline-none focus:ring-2 focus:ring-trago-orange/30 focus:border-trago-orange/50 transition-all"
              />
            </div>
          </main>

          {/* Sticky checkout footer */}
          <div className="fixed bottom-0 inset-x-0 z-30 glass-heavy px-4 py-4 pb-[max(1rem,env(safe-area-inset-bottom))]">
            <div className="flex items-center justify-between mb-3 px-1">
              <span className="text-trago-muted text-base">Total</span>
              <span className="text-white font-bold text-xl tabular-nums">
                {formatCLP(totalCLP)}
              </span>
            </div>
            <Link
              href={`/${slug}/checkout`}
              className="flex items-center justify-center gap-2 w-full h-16 bg-trago-orange text-white font-bold text-lg rounded-2xl glow-orange touch-manipulation press-scale"
            >
              <span>Ir al pago</span>
              <ChevronRight className="w-5 h-5 opacity-70" />
            </Link>
          </div>
        </>
      )}
    </div>
  );
}
