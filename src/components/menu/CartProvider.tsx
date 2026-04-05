"use client";

import { createContext, useContext, useState, useCallback, useEffect, ReactNode } from "react";
import type { Product } from "@/lib/supabase/types";
import { SESSION_ID_KEY, STATION_ID_KEY } from "@/lib/constants";

const CART_KEY = "trago_cart";

export type CartItem = {
  product: Product;
  quantity: number;
  notes?: string;
};

export type CartContextType = {
  items: CartItem[];
  addItem: (product: Product) => void;
  removeItem: (productId: string) => void;
  updateQuantity: (productId: string, quantity: number) => void;
  updateItemNotes: (productId: string, notes: string) => void;
  clearCart: () => void;
  totalCount: number;
  totalCLP: number;
  orderNotes: string;
  setOrderNotes: (notes: string) => void;
  sessionId: string;
  stationId: string | null;
  setStationId: (id: string) => void;
};

export const CartContext = createContext<CartContextType | null>(null);

export function useCartContext() {
  const ctx = useContext(CartContext);
  if (!ctx) throw new Error("useCartContext must be used within CartProvider");
  return ctx;
}

function getOrCreateSessionId(): string {
  if (typeof window === "undefined") return "";
  const existing = sessionStorage.getItem(SESSION_ID_KEY);
  if (existing) return existing;
  const id = crypto.randomUUID();
  sessionStorage.setItem(SESSION_ID_KEY, id);
  return id;
}

function loadStationId(): string | null {
  if (typeof window === "undefined") return null;
  return sessionStorage.getItem(STATION_ID_KEY);
}

function loadCart(): CartItem[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = sessionStorage.getItem(CART_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch { return []; }
}

export default function CartProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<CartItem[]>(loadCart);
  const [orderNotes, setOrderNotes] = useState("");
  const [sessionId] = useState<string>(getOrCreateSessionId);
  const [stationId, setStationIdState] = useState<string | null>(loadStationId);

  const setStationId = useCallback((id: string) => {
    setStationIdState(id);
    try { sessionStorage.setItem(STATION_ID_KEY, id); } catch {}
  }, []);

  useEffect(() => {
    try { sessionStorage.setItem(CART_KEY, JSON.stringify(items)); } catch {}
  }, [items]);

  const addItem = useCallback((product: Product) => {
    setItems((prev) => {
      const existing = prev.find((i) => i.product.id === product.id);
      if (existing) {
        return prev.map((i) =>
          i.product.id === product.id ? { ...i, quantity: i.quantity + 1 } : i
        );
      }
      return [...prev, { product, quantity: 1 }];
    });
  }, []);

  const removeItem = useCallback((productId: string) => {
    setItems((prev) => prev.filter((i) => i.product.id !== productId));
  }, []);

  const updateQuantity = useCallback((productId: string, quantity: number) => {
    setItems((prev) =>
      quantity <= 0
        ? prev.filter((i) => i.product.id !== productId)
        : prev.map((i) =>
            i.product.id === productId ? { ...i, quantity } : i
          )
    );
  }, []);

  const updateItemNotes = useCallback((productId: string, notes: string) => {
    setItems((prev) =>
      prev.map((i) => (i.product.id === productId ? { ...i, notes } : i))
    );
  }, []);

  const clearCart = useCallback(() => {
    setItems([]);
    setOrderNotes("");
    try { sessionStorage.removeItem(CART_KEY); } catch {}
    // Keep stationId — customer stays at the same station
  }, []);

  const totalCount = items.reduce((sum, i) => sum + i.quantity, 0);
  const totalCLP = items.reduce(
    (sum, i) => sum + i.product.price_clp * i.quantity,
    0
  );

  return (
    <CartContext.Provider
      value={{
        items,
        addItem,
        removeItem,
        updateQuantity,
        updateItemNotes,
        clearCart,
        totalCount,
        totalCLP,
        orderNotes,
        setOrderNotes,
        sessionId,
        stationId,
        setStationId,
      }}
    >
      {children}
    </CartContext.Provider>
  );
}
