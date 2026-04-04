"use client";

import { useState, useMemo } from "react";
import Image from "next/image";
import Link from "next/link";
import { ShoppingBag, ChevronRight } from "lucide-react";
import type { Category, Product, Venue } from "@/lib/supabase/types";
import CategoryNav from "./CategoryNav";
import ProductCard from "./ProductCard";
import { useCart } from "@/hooks/useCart";
import { formatCLP } from "@/lib/format";

interface MenuClientProps {
  venue: Pick<Venue, "id" | "name" | "slug" | "logo_url">;
  categories: Category[];
  products: Product[];
  stationName?: string;
}

export default function MenuClient({ venue, categories, products, stationName }: MenuClientProps) {
  const [selectedCategoryId, setSelectedCategoryId] = useState<string | null>(null);
  const { totalCount, totalCLP } = useCart();

  const visibleProducts = useMemo(() => {
    if (!selectedCategoryId) return products;
    return products.filter((p) => p.category_id === selectedCategoryId);
  }, [products, selectedCategoryId]);

  return (
    <div className="min-h-screen bg-trago-black">
      {/* Sticky header */}
      <header className="sticky top-0 z-20 glass-heavy">
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
          <div>
            <h1 className="text-xl font-display text-white tracking-tight">{venue.name}</h1>
            {stationName && (
              <p className="text-xs text-trago-orange leading-none mt-0.5">{stationName}</p>
            )}
          </div>
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
          <div className="flex flex-col items-center justify-center py-20 text-trago-muted">
            <ShoppingBag className="w-12 h-12 mb-3 opacity-40" />
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
        <div className="fixed bottom-0 inset-x-0 z-30 p-4 pb-[max(1rem,env(safe-area-inset-bottom))] animate-slide-up">
          <Link
            href={`/${venue.slug}/cart`}
            className="flex items-center justify-between w-full bg-trago-orange text-white rounded-2xl px-5 h-16 glow-orange touch-manipulation press-scale"
          >
            <span className="flex items-center gap-3">
              <span className="bg-white/20 text-white text-xs font-bold w-7 h-7 rounded-full flex items-center justify-center tabular-nums">
                {totalCount}
              </span>
              <span className="font-semibold text-base">Ver pedido</span>
            </span>
            <span className="flex items-center gap-1">
              <span className="font-bold text-base tabular-nums">{formatCLP(totalCLP)}</span>
              <ChevronRight className="w-5 h-5 opacity-70" />
            </span>
          </Link>
        </div>
      )}
    </div>
  );
}
