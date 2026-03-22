import { redirect } from "next/navigation";
import { headers } from "next/headers";
import { createClient } from "@/lib/supabase/server";
import DashboardNav from "./DashboardNav";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const headersList = await headers();
  const pathname = headersList.get("x-pathname") ?? "";

  if (pathname === "/dashboard/login") {
    return <>{children}</>;
  }

  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    redirect("/dashboard/login");
  }

  return (
    <div className="min-h-screen bg-trago-black text-white flex">
      <DashboardNav email={user.email ?? ""} />
      <main className="flex-1 ml-56 p-8">{children}</main>
    </div>
  );
}
