"use client";

import Image from "next/image";
import { useState } from "react";
import { Plus, Check, Wine } from "lucide-react";
import type { Product } from "@/lib/supabase/types";
import { useCart } from "@/hooks/useCart";
import { formatCLP } from "@/lib/format";

interface ProductCardProps {
  product: Product;
}

export default function ProductCard({ product }: ProductCardProps) {
  const { addItem } = useCart();
  const [added, setAdded] = useState(false);

  function handleAdd() {
    addItem(product);
    setAdded(true);
    setTimeout(() => setAdded(false), 900);
  }

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

          <button
            onClick={handleAdd}
            aria-label={`Agregar ${product.name} al carrito`}
            className={[
              "flex-shrink-0 min-w-[48px] h-12 px-4 rounded-xl font-semibold text-sm",
              "transition-all duration-200 touch-manipulation press-scale",
              "flex items-center justify-center gap-1.5",
              added
                ? "bg-trago-green text-white"
                : "bg-trago-orange text-white hover:bg-trago-orange-light glow-orange-sm",
            ].join(" ")}
          >
            {added ? (
              <Check className="w-5 h-5" strokeWidth={3} />
            ) : (
              <>
                <Plus className="w-4 h-4" strokeWidth={3} />
                <span>Agregar</span>
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
