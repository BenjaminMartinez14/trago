import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import DashboardNav from "./DashboardNav";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    redirect("/dashboard/login");
  }

  return (
    <div className="min-h-screen bg-zinc-950 text-white flex">
      <DashboardNav email={user.email ?? ""} />
      <main className="flex-1 ml-56 p-8">{children}</main>
    </div>
  );
}
