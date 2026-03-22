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
            "flex-shrink-0 h-10 px-5 rounded-full text-sm font-semibold",
            "transition-all duration-200 touch-manipulation press-scale",
            selectedId === null
              ? "bg-trago-orange text-white glow-orange-sm"
              : "bg-trago-card text-zinc-400 hover:text-white hover:bg-trago-card-hover border border-trago-border",
          ].join(" ")}
        >
          Todo
        </button>

        {categories.map((cat) => (
          <button
            key={cat.id}
            onClick={() => onSelect(cat.id)}
            className={[
              "flex-shrink-0 h-10 px-5 rounded-full text-sm font-semibold",
              "transition-all duration-200 touch-manipulation press-scale",
              selectedId === cat.id
                ? "bg-trago-orange text-white glow-orange-sm"
                : "bg-trago-card text-zinc-400 hover:text-white hover:bg-trago-card-hover border border-trago-border",
            ].join(" ")}
          >
            {cat.name}
          </button>
        ))}
      </div>
    </div>
  );
}
