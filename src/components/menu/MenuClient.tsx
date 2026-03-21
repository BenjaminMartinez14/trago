"use client";

import { useState, useMemo } from "react";
import Image from "next/image";
import Link from "next/link";
import type { Category, Product, Venue } from "@/lib/supabase/types";
import CategoryNav from "./CategoryNav";
import ProductCard from "./ProductCard";
import { useCart } from "@/hooks/useCart";
import { formatCLP } from "@/lib/format";

interface MenuClientProps {
  venue: Pick<Venue, "id" | "name" | "slug" | "logo_url">;
  categories: Category[];
  products: Product[];
}

export default function MenuClient({ venue, categories, products }: MenuClientProps) {
  const [selectedCategoryId, setSelectedCategoryId] = useState<string | null>(null);
  const { totalCount, totalCLP } = useCart();

  const visibleProducts = useMemo(() => {
    if (!selectedCategoryId) return products;
    return products.filter((p) => p.category_id === selectedCategoryId);
  }, [products, selectedCategoryId]);

  return (
    <div className="min-h-screen bg-black">
      {/* Sticky header */}
      <header className="sticky top-0 z-20 bg-black/95 backdrop-blur-sm border-b border-zinc-800/60">
        <div className="px-4 pt-4 pb-0 flex items-center gap-3">
          {venue.logo_url ? (
            <Image
              src={venue.logo_url}
              alt={venue.name}
              width={36}
              height={36}
              className="rounded-lg object-cover flex-shrink-0"
            />
          ) : null}
          <h1 className="text-xl font-bold text-white tracking-tight">{venue.name}</h1>
        </div>

        <div className="px-4">
          <CategoryNav
            categories={categories}
            selectedId={selectedCategoryId}
            onSelect={setSelectedCategoryId}
          />
        </div>
      </header>

      {/* Product list */}
      <main className="px-4 py-4 pb-32 space-y-3">
        {visibleProducts.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-zinc-500">
            <span className="text-4xl mb-3" aria-hidden>🫙</span>
            <p className="text-base">Sin productos disponibles</p>
          </div>
        ) : (
          visibleProducts.map((product) => (
            <ProductCard key={product.id} product={product} />
          ))
        )}
      </main>

      {/* Floating cart bar */}
      {totalCount > 0 && (
        <div className="fixed bottom-0 inset-x-0 z-30 p-4 pb-[max(1rem,env(safe-area-inset-bottom))]">
          <Link
            href={`/${venue.slug}/cart`}
            className="flex items-center justify-between w-full bg-white text-black rounded-2xl px-5 h-16 shadow-2xl touch-manipulation"
          >
            <span className="flex items-center gap-2.5">
              <span className="bg-black text-white text-xs font-bold w-6 h-6 rounded-full flex items-center justify-center tabular-nums">
                {totalCount}
              </span>
              <span className="font-semibold text-base">Ver pedido</span>
            </span>
            <span className="font-bold text-base tabular-nums">{formatCLP(totalCLP)}</span>
          </Link>
        </div>
      )}
    </div>
  );
}
