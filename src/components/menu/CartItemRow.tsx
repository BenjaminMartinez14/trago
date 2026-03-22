"use client";

import { Minus, Plus, X } from "lucide-react";
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
    <div className="bg-trago-card rounded-2xl p-4 border border-trago-border animate-fade-in">
      <div className="flex items-start justify-between gap-3">
        <div className="flex-1 min-w-0">
          <p className="text-white font-semibold text-base leading-snug">
            {product.name}
          </p>
          <p className="text-trago-muted text-sm mt-0.5 tabular-nums">
            {formatCLP(product.price_clp)} c/u
          </p>
        </div>

        {/* Remove */}
        <button
          onClick={() => removeItem(product.id)}
          aria-label={`Eliminar ${product.name}`}
          className="flex-shrink-0 w-8 h-8 flex items-center justify-center text-zinc-500 hover:text-red-400 transition-colors touch-manipulation rounded-lg hover:bg-red-400/10"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      <div className="flex items-center justify-between mt-3">
        {/* Quantity stepper */}
        <div className="flex items-center gap-0.5 bg-trago-dark rounded-xl overflow-hidden border border-trago-border">
          <button
            onClick={() => updateQuantity(product.id, quantity - 1)}
            aria-label="Reducir cantidad"
            className="w-11 h-11 flex items-center justify-center text-white hover:bg-zinc-800 active:bg-zinc-700 transition-colors touch-manipulation"
          >
            <Minus className="w-4 h-4" />
          </button>
          <span className="w-8 text-center text-white font-bold tabular-nums select-none">
            {quantity}
          </span>
          <button
            onClick={() => updateQuantity(product.id, quantity + 1)}
            aria-label="Aumentar cantidad"
            className="w-11 h-11 flex items-center justify-center text-white hover:bg-zinc-800 active:bg-zinc-700 transition-colors touch-manipulation"
          >
            <Plus className="w-4 h-4" />
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
