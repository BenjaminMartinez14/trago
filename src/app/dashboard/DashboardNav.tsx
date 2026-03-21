"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

export default function DashboardNav({ email }: { email: string }) {
  const pathname = usePathname();
  const router = useRouter();

  const links = [
    { href: "/dashboard", label: "Inicio" },
    { href: "/dashboard/orders", label: "Pedidos" },
    { href: "/dashboard/menu", label: "Menú" },
  ];

  async function handleSignOut() {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push("/dashboard/login");
    router.refresh();
  }

  return (
    <aside className="fixed top-0 left-0 h-full w-56 bg-zinc-900 border-r border-zinc-800 flex flex-col">
      <div className="px-5 py-5 border-b border-zinc-800">
        <p className="text-amber-400 font-bold text-lg tracking-tight">Trago</p>
        <p className="text-zinc-500 text-xs truncate mt-0.5">{email}</p>
      </div>

      <nav className="flex-1 px-3 py-4 space-y-1">
        {links.map(({ href, label }) => {
          const active =
            href === "/dashboard"
              ? pathname === "/dashboard"
              : pathname.startsWith(href);
          return (
            <Link
              key={href}
              href={href}
              className={`block px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                active
                  ? "bg-amber-500/10 text-amber-400"
                  : "text-zinc-400 hover:text-white hover:bg-zinc-800"
              }`}
            >
              {label}
            </Link>
          );
        })}
      </nav>

      <div className="px-3 py-4 border-t border-zinc-800">
        <button
          onClick={handleSignOut}
          className="w-full px-3 py-2 text-sm text-zinc-400 hover:text-white hover:bg-zinc-800 rounded-lg transition-colors text-left"
        >
          Cerrar sesión
        </button>
      </div>
    </aside>
  );
}
