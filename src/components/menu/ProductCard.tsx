"use client";

import Image from "next/image";
import { useState } from "react";
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
    <div className="flex gap-3 bg-zinc-900 rounded-2xl overflow-hidden">
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
        <div className="w-28 flex-shrink-0 bg-zinc-800 flex items-center justify-center">
          <span className="text-3xl select-none" aria-hidden>🥃</span>
        </div>
      )}

      {/* Content */}
      <div className="flex-1 flex flex-col justify-between py-4 pr-4 min-w-0">
        <div>
          <p className="text-white font-bold text-base leading-snug">{product.name}</p>
          {product.description && (
            <p className="text-zinc-400 text-sm mt-0.5 leading-snug line-clamp-2">
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
              "flex-shrink-0 min-w-[48px] h-12 px-4 rounded-xl font-bold text-sm",
              "transition-all duration-150 touch-manipulation select-none",
              added
                ? "bg-green-500 text-white scale-95"
                : "bg-white text-black hover:bg-zinc-200 active:scale-95",
            ].join(" ")}
          >
            {added ? "✓" : "+ Agregar"}
          </button>
        </div>
      </div>
    </div>
  );
}
