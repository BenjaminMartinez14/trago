import { notFound, redirect } from "next/navigation";
import Link from "next/link";
import type { Metadata } from "next";
import { createServiceClient } from "@/lib/supabase/server";
import MenuClient from "@/components/menu/MenuClient";
import type { Category, Product, Venue, Station } from "@/lib/supabase/types";

interface Props {
  params: { venue: string };
  searchParams: { s?: string };
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const supabase = createServiceClient();
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

export default async function MenuPage({ params, searchParams }: Props) {
  const supabase = createServiceClient();

  const { data: venueRaw } = await supabase
    .from("venues")
    .select("id, name, slug, logo_url")
    .eq("slug", params.venue)
    .eq("active", true)
    .single();

  const venue = venueRaw as Pick<Venue, "id" | "name" | "slug" | "logo_url"> | null;
  if (!venue) notFound();

  const stationSlug = searchParams.s;

  // ── Station-filtered menu ──────────────────────────────────────────────────
  if (stationSlug) {
    const { data: stationRaw } = await supabase
      .from("stations")
      .select("id, name, slug")
      .eq("venue_id", venue.id)
      .eq("slug", stationSlug)
      .eq("active", true)
      .single();

    const station = stationRaw as Pick<Station, "id" | "name" | "slug"> | null;
    if (!station) notFound();

    const { data: spRows } = await supabase
      .from("station_products")
      .select("product_id")
      .eq("station_id", station.id);

    const assignedProductIds = new Set((spRows ?? []).map((r: any) => r.product_id as string));

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

    const allProducts = (productsRes.data ?? []) as Product[];
    const stationProducts = allProducts.filter((p) => assignedProductIds.has(p.id));

    const categoryIdsWithProducts = new Set(stationProducts.map((p) => p.category_id));
    const categories = ((categoriesRes.data ?? []) as Category[]).filter(
      (c) => categoryIdsWithProducts.has(c.id)
    );

    return (
      <MenuClient
        venue={venue}
        categories={categories}
        products={stationProducts}
        stationName={station.name}
      />
    );
  }

  // ── Station picker (no ?s= param) ─────────────────────────────────────────
  const { data: stationsRaw } = await supabase
    .from("stations")
    .select("id, name, slug")
    .eq("venue_id", venue.id)
    .eq("active", true)
    .order("created_at");

  const stations = (stationsRaw ?? []) as Pick<Station, "id" | "name" | "slug">[];

  if (stations.length === 1) {
    redirect(`/${params.venue}?s=${stations[0].slug}`);
  }

  if (stations.length === 0) {
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
    return (
      <MenuClient
        venue={venue}
        categories={(categoriesRes.data ?? []) as Category[]}
        products={(productsRes.data ?? []) as Product[]}
      />
    );
  }

  return (
    <div className="min-h-screen bg-trago-black flex flex-col items-center justify-start px-4 pt-16 pb-8">
      {venue.logo_url && (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={venue.logo_url} alt={venue.name} className="w-16 h-16 rounded-2xl object-cover mb-6" />
      )}
      <h1 className="text-2xl font-display text-white mb-1">{venue.name}</h1>
      <p className="text-zinc-500 text-sm mb-8">Selecciona tu zona</p>
      <div className="w-full max-w-sm space-y-3">
        {stations.map((s) => (
          <Link
            key={s.id}
            href={`/${params.venue}?s=${s.slug}`}
            className="flex items-center justify-between w-full px-5 py-4 bg-trago-card border border-trago-border rounded-2xl text-white hover:border-trago-orange/50 hover:bg-trago-orange/5 transition-all active:scale-95"
          >
            <span className="text-base font-medium">{s.name}</span>
            <span className="text-trago-orange text-lg">›</span>
          </Link>
        ))}
      </div>
    </div>
  );
}
