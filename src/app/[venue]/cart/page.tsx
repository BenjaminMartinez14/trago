"use client";

import Link from "next/link";
import { useRouter, useParams } from "next/navigation";
import { useCart } from "@/hooks/useCart";
import CartItemRow from "@/components/menu/CartItemRow";
import { formatCLP } from "@/lib/format";

export default function CartPage() {
  const router = useRouter();
  const params = useParams<{ venue: string }>();
  const { items, totalCLP, orderNotes, setOrderNotes } = useCart();
  const slug = params.venue;

  return (
    <div className="min-h-screen bg-black flex flex-col">
      {/* Header */}
      <header className="sticky top-0 z-20 bg-black/95 backdrop-blur-sm border-b border-zinc-800/60">
        <div className="flex items-center gap-3 px-4 h-16">
          <button
            onClick={() => router.back()}
            aria-label="Volver al menú"
            className="w-10 h-10 flex items-center justify-center text-white text-xl touch-manipulation -ml-1"
          >
            ←
          </button>
          <h1 className="text-xl font-bold text-white tracking-tight">Mi pedido</h1>
        </div>
      </header>

      {items.length === 0 ? (
        /* Empty state */
        <div className="flex-1 flex flex-col items-center justify-center px-4 text-center gap-4">
          <span className="text-5xl" aria-hidden>🛒</span>
          <p className="text-white font-semibold text-lg">Tu pedido está vacío</p>
          <p className="text-zinc-400 text-sm">Agrega productos desde el menú</p>
          <Link
            href={`/${slug}`}
            className="mt-2 h-12 px-6 bg-white text-black font-semibold rounded-xl flex items-center touch-manipulation"
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
            <div className="bg-zinc-900 rounded-2xl p-4 mt-2">
              <label
                htmlFor="order-notes"
                className="block text-zinc-400 text-sm font-medium mb-2"
              >
                Notas del pedido (opcional)
              </label>
              <textarea
                id="order-notes"
                value={orderNotes}
                onChange={(e) => setOrderNotes(e.target.value)}
                placeholder="Ej: sin hielo, sin gas…"
                rows={3}
                className="w-full bg-zinc-800 text-white placeholder-zinc-500 rounded-xl px-4 py-3 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-white/20"
              />
            </div>
          </main>

          {/* Sticky checkout footer */}
          <div className="fixed bottom-0 inset-x-0 z-30 bg-black/95 backdrop-blur-sm border-t border-zinc-800/60 px-4 py-4 pb-[max(1rem,env(safe-area-inset-bottom))]">
            <div className="flex items-center justify-between mb-3 px-1">
              <span className="text-zinc-400 text-base">Total</span>
              <span className="text-white font-bold text-xl tabular-nums">
                {formatCLP(totalCLP)}
              </span>
            </div>
            <Link
              href={`/${slug}/checkout`}
              className="flex items-center justify-center w-full h-16 bg-white text-black font-bold text-lg rounded-2xl shadow-2xl touch-manipulation"
            >
              Ir al pago
            </Link>
          </div>
        </>
      )}
    </div>
  );
}
