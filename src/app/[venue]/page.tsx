import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { createClient } from "@/lib/supabase/server";
import MenuClient from "@/components/menu/MenuClient";
import type { Category, Product, Venue } from "@/lib/supabase/types";

interface Props {
  params: { venue: string };
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const supabase = createClient();
  const { data } = await supabase
    .from("venues")
    .select("name")
    .eq("slug", params.venue)
    .eq("active", true)
    .single();

  const venue = data as Pick<Venue, "name"> | null;
  return {
    title: venue ? `${venue.name} — Trago` : "Trago",
  };
}

export default async function MenuPage({ params }: Props) {
  const supabase = createClient();

  const { data: venueRaw } = await supabase
    .from("venues")
    .select("id, name, slug, logo_url")
    .eq("slug", params.venue)
    .eq("active", true)
    .single();

  const venue = venueRaw as Pick<Venue, "id" | "name" | "slug" | "logo_url"> | null;
  if (!venue) notFound();

  const [categoriesRes, productsRes] = await Promise.all([
    supabase
      .from("categories")
      .select("*")
      .eq("venue_id", venue.id)
      .eq("active", true)
      .order("display_order"),
    supabase
      .from("products")
      .select("*")
      .eq("venue_id", venue.id)
      .eq("available", true)
      .order("display_order"),
  ]);

  const categories = (categoriesRes.data ?? []) as Category[];
  const products = (productsRes.data ?? []) as Product[];

  return (
    <MenuClient
      venue={venue}
      categories={categories}
      products={products}
    />
  );
}
