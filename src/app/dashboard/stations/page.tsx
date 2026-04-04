"use client";

import { useEffect, useState } from "react";
import { Plus, Pencil, Trash2, ChevronRight, Check, X, Loader2 } from "lucide-react";
import type { Station, Product } from "@/lib/supabase/types";

const VENUE_ID = "a1b2c3d4-0000-0000-0000-000000000001";

interface StationWithVenue extends Station {
  venues: { slug: string; name: string };
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function slugify(text: string) {
  return text
    .toLowerCase()
    .trim()
    .replace(/\s+/g, "-")
    .replace(/[^a-z0-9-]/g, "");
}

// ── Main page ─────────────────────────────────────────────────────────────────

export default function StationsPage() {
  const [stations, setStations] = useState<StationWithVenue[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);

  // Selected station for product assignment
  const [selected, setSelected] = useState<StationWithVenue | null>(null);
  const [assignedIds, setAssignedIds] = useState<Set<string>>(new Set());
  const [loadingAssign, setLoadingAssign] = useState(false);
  const [savingAssign, setSavingAssign] = useState(false);

  // Create form
  const [showCreate, setShowCreate] = useState(false);
  const [createName, setCreateName] = useState("");
  const [createSlug, setCreateSlug] = useState("");
  const [creating, setCreating] = useState(false);
  const [createError, setCreateError] = useState("");

  // Edit form
  const [editId, setEditId] = useState<string | null>(null);
  const [editName, setEditName] = useState("");
  const [editSlug, setEditSlug] = useState("");
  const [saving, setSaving] = useState(false);

  async function loadAll() {
    const [stRes, prRes] = await Promise.all([
      fetch("/api/dashboard/stations").then((r) => r.json()),
      fetch("/api/dashboard/products").then((r) => r.json()),
    ]);
    setStations(stRes.stations ?? []);
    setProducts(prRes.products ?? []);
    setLoading(false);
  }

  useEffect(() => { loadAll(); }, []);

  async function openAssign(station: StationWithVenue) {
    setSelected(station);
    setLoadingAssign(true);
    const res = await fetch(`/api/dashboard/stations/${station.id}/products`);
    const data = await res.json();
    setAssignedIds(new Set(data.productIds ?? []));
    setLoadingAssign(false);
  }

  async function saveAssign() {
    if (!selected) return;
    setSavingAssign(true);
    await fetch(`/api/dashboard/stations/${selected.id}/products`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ productIds: Array.from(assignedIds) }),
    });
    setSavingAssign(false);
  }

  function toggleProduct(id: string) {
    setAssignedIds((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  }

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    const name = createName.trim();
    const slug = createSlug.trim() || slugify(name);
    if (!name) return;
    setCreating(true);
    setCreateError("");
    const res = await fetch("/api/dashboard/stations", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ venue_id: VENUE_ID, name, slug }),
    });
    if (!res.ok) {
      const d = await res.json();
      setCreateError(d.error === "SLUG_EXISTS" ? "Ya existe una estación con ese slug" : "Error al crear");
      setCreating(false);
      return;
    }
    const { station } = await res.json();
    setStations((prev) => [...prev, station]);
    setCreateName("");
    setCreateSlug("");
    setShowCreate(false);
    setCreating(false);
  }

  function startEdit(s: StationWithVenue) {
    setEditId(s.id);
    setEditName(s.name);
    setEditSlug(s.slug);
  }

  async function handleEdit(e: React.FormEvent) {
    e.preventDefault();
    if (!editId) return;
    setSaving(true);
    const res = await fetch(`/api/dashboard/stations/${editId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: editName.trim(), slug: editSlug.trim() }),
    });
    if (res.ok) {
      const { station } = await res.json();
      setStations((prev) => prev.map((s) => s.id === editId ? { ...s, ...station } : s));
      if (selected?.id === editId) setSelected((prev) => prev ? { ...prev, ...station } : prev);
    }
    setEditId(null);
    setSaving(false);
  }

  async function handleDelete(id: string) {
    if (!confirm("¿Eliminar esta estación?")) return;
    await fetch(`/api/dashboard/stations/${id}`, { method: "DELETE" });
    setStations((prev) => prev.filter((s) => s.id !== id));
    if (selected?.id === id) setSelected(null);
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-48 text-trago-muted">
        <Loader2 className="w-5 h-5 animate-spin mr-2" /> Cargando...
      </div>
    );
  }

  return (
    <div className="max-w-5xl">
      <h1 className="text-2xl font-display mb-6">Estaciones</h1>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Station list */}
        <div>
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-sm font-semibold text-zinc-400 uppercase tracking-wider">
              Zonas del local
            </h2>
            <button
              onClick={() => setShowCreate((v) => !v)}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-trago-orange hover:bg-trago-orange-light text-white text-sm font-semibold rounded-lg transition-colors press-scale"
            >
              <Plus className="w-4 h-4" /> Nueva
            </button>
          </div>

          {/* Create form */}
          {showCreate && (
            <form
              onSubmit={handleCreate}
              className="bg-trago-card border border-trago-orange/30 rounded-xl p-4 mb-3 space-y-2"
            >
              <input
                type="text"
                value={createName}
                onChange={(e) => {
                  setCreateName(e.target.value);
                  setCreateSlug(slugify(e.target.value));
                }}
                placeholder="Nombre (ej: Barra VIP)"
                className="w-full px-3 py-2 bg-trago-dark border border-trago-border rounded-lg text-white placeholder-zinc-600 focus:outline-none focus:ring-2 focus:ring-trago-orange/30 focus:border-trago-orange/50 text-sm"
                autoFocus
              />
              <input
                type="text"
                value={createSlug}
                onChange={(e) => setCreateSlug(e.target.value)}
                placeholder="Slug (ej: barra-vip)"
                className="w-full px-3 py-2 bg-trago-dark border border-trago-border rounded-lg text-white placeholder-zinc-600 focus:outline-none focus:ring-2 focus:ring-trago-orange/30 focus:border-trago-orange/50 text-sm font-mono"
              />
              {createError && <p className="text-red-400 text-xs">{createError}</p>}
              <div className="flex gap-2">
                <button
                  type="submit"
                  disabled={!createName.trim() || creating}
                  className="px-3 py-1.5 bg-trago-orange hover:bg-trago-orange-light disabled:opacity-50 text-white text-sm font-semibold rounded-lg transition-colors"
                >
                  {creating ? "Creando..." : "Crear"}
                </button>
                <button
                  type="button"
                  onClick={() => { setShowCreate(false); setCreateName(""); setCreateSlug(""); setCreateError(""); }}
                  className="px-3 py-1.5 bg-trago-dark border border-trago-border hover:bg-white/5 text-zinc-400 text-sm rounded-lg transition-colors"
                >
                  Cancelar
                </button>
              </div>
            </form>
          )}

          {/* Stations list */}
          <div className="space-y-2">
            {stations.length === 0 && (
              <p className="text-zinc-500 text-sm py-4 text-center">Sin estaciones aún</p>
            )}
            {stations.map((s) => (
              <div key={s.id}>
                {editId === s.id ? (
                  <form
                    onSubmit={handleEdit}
                    className="bg-trago-card border border-trago-orange/30 rounded-xl p-3 space-y-2"
                  >
                    <input
                      type="text"
                      value={editName}
                      onChange={(e) => setEditName(e.target.value)}
                      className="w-full px-3 py-2 bg-trago-dark border border-trago-border rounded-lg text-white text-sm focus:outline-none focus:ring-2 focus:ring-trago-orange/30 focus:border-trago-orange/50"
                      autoFocus
                    />
                    <input
                      type="text"
                      value={editSlug}
                      onChange={(e) => setEditSlug(e.target.value)}
                      className="w-full px-3 py-2 bg-trago-dark border border-trago-border rounded-lg text-white text-sm font-mono focus:outline-none focus:ring-2 focus:ring-trago-orange/30 focus:border-trago-orange/50"
                    />
                    <div className="flex gap-2">
                      <button
                        type="submit"
                        disabled={saving}
                        className="px-3 py-1.5 bg-trago-orange hover:bg-trago-orange-light disabled:opacity-50 text-white text-sm font-semibold rounded-lg transition-colors"
                      >
                        {saving ? "Guardando..." : "Guardar"}
                      </button>
                      <button
                        type="button"
                        onClick={() => setEditId(null)}
                        className="px-3 py-1.5 bg-trago-dark border border-trago-border hover:bg-white/5 text-zinc-400 text-sm rounded-lg transition-colors"
                      >
                        Cancelar
                      </button>
                    </div>
                  </form>
                ) : (
                  <button
                    onClick={() => openAssign(s)}
                    className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl border transition-all text-left group ${
                      selected?.id === s.id
                        ? "bg-trago-orange/10 border-trago-orange/40"
                        : "bg-trago-card border-trago-border hover:border-zinc-600"
                    }`}
                  >
                    <div className="flex-1 min-w-0">
                      <p className={`text-sm font-medium ${selected?.id === s.id ? "text-trago-orange" : "text-white"}`}>
                        {s.name}
                      </p>
                      <p className="text-xs text-zinc-500 font-mono">/{s.slug}</p>
                    </div>
                    <div className="flex items-center gap-1 shrink-0">
                      <button
                        onClick={(e) => { e.stopPropagation(); startEdit(s); }}
                        className="p-1.5 rounded-lg hover:bg-white/10 text-zinc-500 hover:text-zinc-300 transition-colors"
                        title="Editar"
                      >
                        <Pencil className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={(e) => { e.stopPropagation(); handleDelete(s.id); }}
                        className="p-1.5 rounded-lg hover:bg-red-900/30 text-zinc-500 hover:text-red-400 transition-colors"
                        title="Eliminar"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                      <ChevronRight className={`w-4 h-4 transition-colors ${selected?.id === s.id ? "text-trago-orange" : "text-zinc-600"}`} />
                    </div>
                  </button>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Product assignment panel */}
        <div>
          {!selected ? (
            <div className="flex items-center justify-center h-48 text-zinc-600 text-sm border border-dashed border-zinc-800 rounded-xl">
              Selecciona una estación para asignar productos
            </div>
          ) : (
            <div className="bg-trago-card border border-trago-border rounded-xl">
              <div className="px-4 py-3 border-b border-trago-border flex items-center justify-between">
                <div>
                  <p className="text-sm font-semibold text-white">{selected.name}</p>
                  <p className="text-xs text-zinc-500">Productos disponibles en esta estación</p>
                </div>
                <button
                  onClick={() => setSelected(null)}
                  className="p-1.5 rounded-lg hover:bg-white/5 text-zinc-500 hover:text-zinc-300 transition-colors"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              {loadingAssign ? (
                <div className="flex items-center justify-center h-32 text-trago-muted">
                  <Loader2 className="w-4 h-4 animate-spin mr-2" /> Cargando...
                </div>
              ) : (
                <>
                  <div className="divide-y divide-trago-border max-h-96 overflow-y-auto">
                    {products.length === 0 && (
                      <p className="text-zinc-500 text-sm p-4 text-center">No hay productos</p>
                    )}
                    {products.map((p) => {
                      const checked = assignedIds.has(p.id);
                      return (
                        <label
                          key={p.id}
                          className="flex items-center gap-3 px-4 py-3 cursor-pointer hover:bg-white/3 transition-colors"
                        >
                          <div className={`w-5 h-5 rounded border flex items-center justify-center shrink-0 transition-colors ${
                            checked ? "bg-trago-orange border-trago-orange" : "border-zinc-600 bg-trago-dark"
                          }`}>
                            {checked && <Check className="w-3 h-3 text-white" />}
                          </div>
                          <input
                            type="checkbox"
                            className="sr-only"
                            checked={checked}
                            onChange={() => toggleProduct(p.id)}
                          />
                          <span className="text-sm text-zinc-300 flex-1 truncate">{p.name}</span>
                        </label>
                      );
                    })}
                  </div>

                  <div className="px-4 py-3 border-t border-trago-border flex items-center justify-between">
                    <span className="text-xs text-zinc-500">
                      {assignedIds.size} de {products.length} seleccionados
                    </span>
                    <button
                      onClick={saveAssign}
                      disabled={savingAssign}
                      className="px-4 py-2 bg-trago-orange hover:bg-trago-orange-light disabled:opacity-50 text-white text-sm font-semibold rounded-lg transition-colors press-scale"
                    >
                      {savingAssign ? "Guardando..." : "Guardar"}
                    </button>
                  </div>
                </>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
