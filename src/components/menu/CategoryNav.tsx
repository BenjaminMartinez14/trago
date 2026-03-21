"use client";

import type { Category } from "@/lib/supabase/types";

interface CategoryNavProps {
  categories: Category[];
  selectedId: string | null;
  onSelect: (id: string | null) => void;
}

export default function CategoryNav({ categories, selectedId, onSelect }: CategoryNavProps) {
  return (
    <div className="overflow-x-auto scrollbar-hide -mx-4 px-4">
      <div className="flex gap-2 py-3 w-max">
        <button
          onClick={() => onSelect(null)}
          className={[
            "flex-shrink-0 h-10 px-5 rounded-full text-sm font-semibold transition-colors duration-150 touch-manipulation",
            selectedId === null
              ? "bg-white text-black"
              : "bg-zinc-900 text-zinc-400 hover:text-white hover:bg-zinc-800",
          ].join(" ")}
        >
          Todo
        </button>

        {categories.map((cat) => (
          <button
            key={cat.id}
            onClick={() => onSelect(cat.id)}
            className={[
              "flex-shrink-0 h-10 px-5 rounded-full text-sm font-semibold transition-colors duration-150 touch-manipulation",
              selectedId === cat.id
                ? "bg-white text-black"
                : "bg-zinc-900 text-zinc-400 hover:text-white hover:bg-zinc-800",
            ].join(" ")}
          >
            {cat.name}
          </button>
        ))}
      </div>
    </div>
  );
}
