"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { Home, ShoppingBag, UtensilsCrossed, LogOut } from "lucide-react";
import { createClient } from "@/lib/supabase/client";

export default function DashboardNav({ email }: { email: string }) {
  const pathname = usePathname();
  const router = useRouter();

  const links = [
    { href: "/dashboard", label: "Inicio", icon: Home },
    { href: "/dashboard/orders", label: "Pedidos", icon: ShoppingBag },
    { href: "/dashboard/menu", label: "Menú", icon: UtensilsCrossed },
  ];

  async function handleSignOut() {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push("/dashboard/login");
    router.refresh();
  }

  return (
    <aside className="fixed top-0 left-0 h-full w-56 bg-trago-dark border-r border-trago-border flex flex-col">
      <div className="px-5 py-5 border-b border-trago-border">
        <p className="text-trago-orange font-display text-lg tracking-tight">Trago</p>
        <p className="text-trago-muted text-xs truncate mt-0.5">{email}</p>
      </div>

      <nav className="flex-1 px-3 py-4 space-y-1">
        {links.map(({ href, label, icon: Icon }) => {
          const active =
            href === "/dashboard"
              ? pathname === "/dashboard"
              : pathname.startsWith(href);
          return (
            <Link
              key={href}
              href={href}
              className={`flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-sm font-medium transition-all duration-200 ${
                active
                  ? "bg-trago-orange/10 text-trago-orange"
                  : "text-zinc-400 hover:text-white hover:bg-white/5"
              }`}
            >
              <Icon className="w-4 h-4" />
              {label}
            </Link>
          );
        })}
      </nav>

      <div className="px-3 py-4 border-t border-trago-border">
        <button
          onClick={handleSignOut}
          className="w-full flex items-center gap-2.5 px-3 py-2.5 text-sm text-zinc-400 hover:text-white hover:bg-white/5 rounded-xl transition-colors text-left"
        >
          <LogOut className="w-4 h-4" />
          Cerrar sesión
        </button>
      </div>
    </aside>
  );
}
