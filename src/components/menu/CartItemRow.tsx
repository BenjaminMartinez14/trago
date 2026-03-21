"use client";

import { formatCLP } from "@/lib/format";
import { useCart } from "@/hooks/useCart";
import type { CartItem } from "./CartProvider";

interface CartItemRowProps {
  item: CartItem;
}

export default function CartItemRow({ item }: CartItemRowProps) {
  const { updateQuantity, removeItem } = useCart();
  const { product, quantity } = item;

  return (
    <div className="bg-zinc-900 rounded-2xl p-4">
      <div className="flex items-start justify-between gap-3">
        <div className="flex-1 min-w-0">
          <p className="text-white font-semibold text-base leading-snug">
            {product.name}
          </p>
          <p className="text-zinc-400 text-sm mt-0.5 tabular-nums">
            {formatCLP(product.price_clp)} c/u
          </p>
        </div>

        {/* Remove */}
        <button
          onClick={() => removeItem(product.id)}
          aria-label={`Eliminar ${product.name}`}
          className="flex-shrink-0 w-7 h-7 flex items-center justify-center text-zinc-500 hover:text-white transition-colors touch-manipulation"
        >
          ✕
        </button>
      </div>

      <div className="flex items-center justify-between mt-3">
        {/* Quantity stepper */}
        <div className="flex items-center gap-1 bg-zinc-800 rounded-xl overflow-hidden">
          <button
            onClick={() => updateQuantity(product.id, quantity - 1)}
            aria-label="Reducir cantidad"
            className="w-11 h-11 flex items-center justify-center text-white text-lg font-bold hover:bg-zinc-700 active:bg-zinc-600 transition-colors touch-manipulation"
          >
            −
          </button>
          <span className="w-8 text-center text-white font-bold tabular-nums select-none">
            {quantity}
          </span>
          <button
            onClick={() => updateQuantity(product.id, quantity + 1)}
            aria-label="Aumentar cantidad"
            className="w-11 h-11 flex items-center justify-center text-white text-lg font-bold hover:bg-zinc-700 active:bg-zinc-600 transition-colors touch-manipulation"
          >
            +
          </button>
        </div>

        {/* Subtotal */}
        <p className="text-white font-bold text-lg tabular-nums">
          {formatCLP(product.price_clp * quantity)}
        </p>
      </div>
    </div>
  );
}
