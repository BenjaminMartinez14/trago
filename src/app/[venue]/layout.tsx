import CartProvider from "@/components/menu/CartProvider";

export default function VenueLayout({ children }: { children: React.ReactNode }) {
  return <CartProvider>{children}</CartProvider>;
}
