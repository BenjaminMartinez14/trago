"use client";

import Image from "next/image";
import { Minus, Plus, Wine } from "lucide-react";
import type { Product } from "@/lib/supabase/types";
import { useCart } from "@/hooks/useCart";
import { formatCLP } from "@/lib/format";

interface ProductCardProps {
  product: Product;
}

export default function ProductCard({ product }: ProductCardProps) {
  const { items, addItem, removeItem, updateQuantity } = useCart();
  const cartItem = items.find((i) => i.product.id === product.id);
  const qty = cartItem?.quantity ?? 0;

  return (
    <div className="flex gap-3 bg-trago-card rounded-2xl overflow-hidden border border-trago-border hover:border-zinc-700/50 transition-colors duration-200 animate-fade-in">
      {/* Thumbnail */}
      {product.image_url ? (
        <div className="relative w-28 flex-shrink-0">
          <Image
            src={product.image_url}
            alt={product.name}
            fill
            className="object-cover"
            sizes="112px"
          />
        </div>
      ) : (
        <div className="w-28 flex-shrink-0 bg-trago-dark flex items-center justify-center">
          <Wine className="w-8 h-8 text-zinc-600" aria-hidden />
        </div>
      )}

      {/* Content */}
      <div className="flex-1 flex flex-col justify-between py-4 pr-4 min-w-0">
        <div>
          <p className="text-white font-semibold text-base leading-snug">{product.name}</p>
          {product.description && (
            <p className="text-trago-muted text-sm mt-0.5 leading-snug line-clamp-2">
              {product.description}
            </p>
          )}
        </div>

        <div className="flex items-center justify-between mt-3 gap-3">
          <span className="text-white font-bold text-lg tabular-nums">
            {formatCLP(product.price_clp)}
          </span>

          {qty === 0 ? (
            <button
              onClick={() => addItem(product)}
              aria-label={`Agregar ${product.name}`}
              className="flex-shrink-0 h-10 px-4 rounded-xl font-semibold text-sm bg-trago-orange text-white hover:bg-trago-orange-light glow-orange-sm transition-all touch-manipulation press-scale flex items-center gap-1.5"
            >
              <Plus className="w-4 h-4" strokeWidth={3} />
              Agregar
            </button>
          ) : (
            <div className="flex items-center gap-2 flex-shrink-0">
              <button
                onClick={() => updateQuantity(product.id, qty - 1)}
                aria-label="Quitar uno"
                className="w-9 h-9 rounded-xl bg-zinc-800 text-white flex items-center justify-center touch-manipulation press-scale hover:bg-zinc-700 transition-colors"
              >
                <Minus className="w-4 h-4" strokeWidth={3} />
              </button>
              <span className="text-white font-bold text-base tabular-nums w-5 text-center">
                {qty}
              </span>
              <button
                onClick={() => addItem(product)}
                aria-label="Agregar uno más"
                className="w-9 h-9 rounded-xl bg-trago-orange text-white flex items-center justify-center touch-manipulation press-scale hover:bg-trago-orange-light glow-orange-sm transition-colors"
              >
                <Plus className="w-4 h-4" strokeWidth={3} />
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
