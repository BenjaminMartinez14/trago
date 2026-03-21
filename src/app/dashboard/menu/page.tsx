"use client";

import { useEffect, useState, useRef } from "react";
import { createClient } from "@/lib/supabase/client";
import { formatCLP } from "@/lib/format";
import type { Category, Product } from "@/lib/supabase/types";

const VENUE_ID = "a1b2c3d4-0000-0000-0000-000000000001"; // from seed data

// ── Types ──────────────────────────────────────────────────────────────────────

interface ProductFormData {
  name: string;
  description: string;
  price_clp: number | "";
  category_id: string;
  available: boolean;
  image_url: string | null;
}

const emptyProduct = (): ProductFormData => ({
  name: "",
  description: "",
  price_clp: "",
  category_id: "",
  available: true,
  image_url: null,
});

// ── Main page ──────────────────────────────────────────────────────────────────

export default function DashboardMenuPage() {
  const [categories, setCategories] = useState<Category[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<"products" | "categories">(
    "products"
  );

  async function reload() {
    const [catRes, prodRes] = await Promise.all([
      fetch("/api/dashboard/categories").then((r) => r.json()),
      fetch("/api/dashboard/products").then((r) => r.json()),
    ]);
    setCategories(catRes.categories ?? []);
    setProducts(prodRes.products ?? []);
    setLoading(false);
  }

  useEffect(() => {
    reload();
  }, []);

  return (
    <div className="max-w-5xl">
      <h1 className="text-2xl font-bold mb-6">Menú</h1>

      {/* Tabs */}
      <div className="flex gap-1 bg-zinc-900 border border-zinc-800 rounded-xl p-1 mb-6 w-fit">
        {(["products", "categories"] as const).map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`px-4 py-1.5 rounded-lg text-sm font-medium transition-colors ${
              activeTab === tab
                ? "bg-amber-500 text-black"
                : "text-zinc-400 hover:text-white"
            }`}
          >
            {tab === "products" ? "Productos" : "Categorías"}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="space-y-3">
          {[0, 1, 2].map((i) => (
            <div key={i} className="bg-zinc-900 rounded-xl h-16 animate-pulse" />
          ))}
        </div>
      ) : activeTab === "products" ? (
        <ProductsTab
          products={products}
          categories={categories}
          onReload={reload}
        />
      ) : (
        <CategoriesTab categories={categories} onReload={reload} />
      )}
    </div>
  );
}

// ── Products tab ───────────────────────────────────────────────────────────────

function ProductsTab({
  products,
  categories,
  onReload,
}: {
  products: Product[];
  categories: Category[];
  onReload: () => void;
}) {
  const [showForm, setShowForm] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);

  function openNew() {
    setEditingProduct(null);
    setShowForm(true);
  }

  function openEdit(p: Product) {
    setEditingProduct(p);
    setShowForm(true);
  }

  function closeForm() {
    setShowForm(false);
    setEditingProduct(null);
  }

  async function handleDelete(id: string) {
    if (!confirm("¿Eliminar este producto?")) return;
    await fetch(`/api/dashboard/products/${id}`, { method: "DELETE" });
    onReload();
  }

  async function handleToggleAvailable(p: Product) {
    await fetch(`/api/dashboard/products/${p.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ available: !p.available }),
    });
    onReload();
  }

  const categoryMap = Object.fromEntries(categories.map((c) => [c.id, c.name]));

  return (
    <div>
      <div className="flex justify-end mb-4">
        <button
          onClick={openNew}
          className="px-4 py-2 bg-amber-500 hover:bg-amber-400 text-black font-semibold rounded-lg text-sm transition-colors"
        >
          + Nuevo producto
        </button>
      </div>

      {showForm && (
        <ProductForm
          product={editingProduct}
          categories={categories}
          onSave={() => {
            closeForm();
            onReload();
          }}
          onCancel={closeForm}
        />
      )}

      <div className="bg-zinc-900 border border-zinc-800 rounded-xl overflow-hidden">
        {products.length === 0 ? (
          <p className="text-zinc-500 text-sm text-center py-12">
            No hay productos. Crea el primero.
          </p>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-zinc-800">
                <th className="text-left px-4 py-3 text-zinc-400 font-medium">Producto</th>
                <th className="text-left px-4 py-3 text-zinc-400 font-medium">Categoría</th>
                <th className="text-left px-4 py-3 text-zinc-400 font-medium">Precio</th>
                <th className="text-left px-4 py-3 text-zinc-400 font-medium">Disponible</th>
                <th className="px-4 py-3" />
              </tr>
            </thead>
            <tbody>
              {products.map((p) => (
                <tr key={p.id} className="border-b border-zinc-800/50 last:border-0">
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-3">
                      {p.image_url && (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                          src={p.image_url}
                          alt=""
                          className="w-8 h-8 rounded object-cover shrink-0"
                        />
                      )}
                      <span className="text-zinc-200 font-medium">{p.name}</span>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-zinc-400">
                    {categoryMap[p.category_id] ?? "—"}
                  </td>
                  <td className="px-4 py-3 text-white">{formatCLP(p.price_clp)}</td>
                  <td className="px-4 py-3">
                    <button
                      onClick={() => handleToggleAvailable(p)}
                      className={`text-xs font-medium px-2 py-0.5 rounded-full transition-colors ${
                        p.available
                          ? "bg-green-500/20 text-green-400 hover:bg-green-500/30"
                          : "bg-zinc-700 text-zinc-400 hover:bg-zinc-600"
                      }`}
                    >
                      {p.available ? "Sí" : "No"}
                    </button>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex gap-2 justify-end">
                      <button
                        onClick={() => openEdit(p)}
                        className="text-zinc-400 hover:text-white text-xs transition-colors"
                      >
                        Editar
                      </button>
                      <button
                        onClick={() => handleDelete(p.id)}
                        className="text-red-500 hover:text-red-400 text-xs transition-colors"
                      >
                        Eliminar
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}

// ── Product form ───────────────────────────────────────────────────────────────

function ProductForm({
  product,
  categories,
  onSave,
  onCancel,
}: {
  product: Product | null;
  categories: Category[];
  onSave: () => void;
  onCancel: () => void;
}) {
  const [form, setForm] = useState<ProductFormData>(
    product
      ? {
          name: product.name,
          description: product.description ?? "",
          price_clp: product.price_clp,
          category_id: product.category_id,
          available: product.available,
          image_url: product.image_url,
        }
      : emptyProduct()
  );
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  async function handleImageUpload(file: File) {
    setUploading(true);
    const supabase = createClient();
    const ext = file.name.split(".").pop();
    const path = `${Date.now()}.${ext}`;

    const { error } = await supabase.storage
      .from("product-images")
      .upload(path, file, { upsert: true });

    if (!error) {
      const { data: urlData } = supabase.storage
        .from("product-images")
        .getPublicUrl(path);
      setForm((f) => ({ ...f, image_url: urlData.publicUrl }));
    }
    setUploading(false);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.name || !form.category_id || form.price_clp === "") return;

    setSaving(true);

    const body = {
      venue_id: VENUE_ID,
      category_id: form.category_id,
      name: form.name,
      description: form.description || null,
      price_clp: Number(form.price_clp),
      image_url: form.image_url,
      available: form.available,
    };

    const url = product
      ? `/api/dashboard/products/${product.id}`
      : "/api/dashboard/products";

    await fetch(url, {
      method: product ? "PATCH" : "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });

    setSaving(false);
    onSave();
  }

  return (
    <div className="bg-zinc-800 border border-zinc-700 rounded-xl p-5 mb-4">
      <h3 className="text-base font-semibold mb-4">
        {product ? "Editar producto" : "Nuevo producto"}
      </h3>

      <form onSubmit={handleSubmit} className="grid grid-cols-2 gap-4">
        <div className="col-span-2 sm:col-span-1">
          <label className="block text-xs text-zinc-400 mb-1">Nombre *</label>
          <input
            value={form.name}
            onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
            required
            className="w-full px-3 py-2 bg-zinc-700 border border-zinc-600 rounded-lg text-white text-sm focus:outline-none focus:ring-2 focus:ring-amber-500"
          />
        </div>

        <div className="col-span-2 sm:col-span-1">
          <label className="block text-xs text-zinc-400 mb-1">Precio (CLP) *</label>
          <input
            type="number"
            value={form.price_clp}
            onChange={(e) =>
              setForm((f) => ({ ...f, price_clp: e.target.value === "" ? "" : Number(e.target.value) }))
            }
            required
            min={0}
            className="w-full px-3 py-2 bg-zinc-700 border border-zinc-600 rounded-lg text-white text-sm focus:outline-none focus:ring-2 focus:ring-amber-500"
          />
        </div>

        <div className="col-span-2">
          <label className="block text-xs text-zinc-400 mb-1">Descripción</label>
          <input
            value={form.description}
            onChange={(e) =>
              setForm((f) => ({ ...f, description: e.target.value }))
            }
            className="w-full px-3 py-2 bg-zinc-700 border border-zinc-600 rounded-lg text-white text-sm focus:outline-none focus:ring-2 focus:ring-amber-500"
          />
        </div>

        <div className="col-span-2 sm:col-span-1">
          <label className="block text-xs text-zinc-400 mb-1">Categoría *</label>
          <select
            value={form.category_id}
            onChange={(e) =>
              setForm((f) => ({ ...f, category_id: e.target.value }))
            }
            required
            className="w-full px-3 py-2 bg-zinc-700 border border-zinc-600 rounded-lg text-white text-sm focus:outline-none focus:ring-2 focus:ring-amber-500"
          >
            <option value="">Seleccionar…</option>
            {categories.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
        </div>

        <div className="col-span-2 sm:col-span-1 flex items-end gap-4">
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={form.available}
              onChange={(e) =>
                setForm((f) => ({ ...f, available: e.target.checked }))
              }
              className="w-4 h-4 accent-amber-500"
            />
            <span className="text-sm text-zinc-300">Disponible</span>
          </label>
        </div>

        <div className="col-span-2">
          <label className="block text-xs text-zinc-400 mb-1">Imagen</label>
          <div className="flex items-center gap-3">
            {form.image_url && (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={form.image_url}
                alt=""
                className="w-12 h-12 rounded-lg object-cover shrink-0"
              />
            )}
            <button
              type="button"
              onClick={() => fileRef.current?.click()}
              disabled={uploading}
              className="px-3 py-2 bg-zinc-700 hover:bg-zinc-600 disabled:opacity-50 text-white text-xs rounded-lg transition-colors"
            >
              {uploading ? "Subiendo…" : "Subir imagen"}
            </button>
            {form.image_url && (
              <button
                type="button"
                onClick={() => setForm((f) => ({ ...f, image_url: null }))}
                className="text-red-400 text-xs hover:text-red-300"
              >
                Quitar
              </button>
            )}
          </div>
          <input
            ref={fileRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (file) handleImageUpload(file);
            }}
          />
        </div>

        <div className="col-span-2 flex gap-3 justify-end pt-2">
          <button
            type="button"
            onClick={onCancel}
            className="px-4 py-2 text-zinc-400 hover:text-white text-sm transition-colors"
          >
            Cancelar
          </button>
          <button
            type="submit"
            disabled={saving}
            className="px-4 py-2 bg-amber-500 hover:bg-amber-400 disabled:opacity-50 text-black font-semibold text-sm rounded-lg transition-colors"
          >
            {saving ? "Guardando…" : "Guardar"}
          </button>
        </div>
      </form>
    </div>
  );
}

// ── Categories tab ─────────────────────────────────────────────────────────────

function CategoriesTab({
  categories,
  onReload,
}: {
  categories: Category[];
  onReload: () => void;
}) {
  const [newName, setNewName] = useState("");
  const [saving, setSaving] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [editName, setEditName] = useState("");

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    if (!newName.trim()) return;
    setSaving(true);
    await fetch("/api/dashboard/categories", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ venue_id: VENUE_ID, name: newName.trim() }),
    });
    setNewName("");
    setSaving(false);
    onReload();
  }

  async function handleUpdate(id: string) {
    if (!editName.trim()) return;
    await fetch(`/api/dashboard/categories/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: editName.trim() }),
    });
    setEditId(null);
    onReload();
  }

  async function handleDelete(id: string) {
    if (!confirm("¿Eliminar esta categoría? Los productos asociados quedarán sin categoría.")) return;
    await fetch(`/api/dashboard/categories/${id}`, { method: "DELETE" });
    onReload();
  }

  return (
    <div>
      <form onSubmit={handleCreate} className="flex gap-3 mb-4">
        <input
          value={newName}
          onChange={(e) => setNewName(e.target.value)}
          placeholder="Nueva categoría…"
          className="flex-1 px-3 py-2 bg-zinc-800 border border-zinc-700 rounded-lg text-white text-sm placeholder-zinc-500 focus:outline-none focus:ring-2 focus:ring-amber-500"
        />
        <button
          type="submit"
          disabled={saving || !newName.trim()}
          className="px-4 py-2 bg-amber-500 hover:bg-amber-400 disabled:opacity-50 text-black font-semibold text-sm rounded-lg transition-colors shrink-0"
        >
          {saving ? "Guardando…" : "Crear"}
        </button>
      </form>

      <div className="bg-zinc-900 border border-zinc-800 rounded-xl overflow-hidden">
        {categories.length === 0 ? (
          <p className="text-zinc-500 text-sm text-center py-12">
            No hay categorías. Crea la primera.
          </p>
        ) : (
          <ul className="divide-y divide-zinc-800">
            {categories.map((c) => (
              <li key={c.id} className="flex items-center gap-3 px-4 py-3">
                {editId === c.id ? (
                  <>
                    <input
                      value={editName}
                      onChange={(e) => setEditName(e.target.value)}
                      className="flex-1 px-2 py-1 bg-zinc-700 border border-zinc-600 rounded text-white text-sm focus:outline-none focus:ring-2 focus:ring-amber-500"
                      autoFocus
                    />
                    <button
                      onClick={() => handleUpdate(c.id)}
                      className="text-amber-400 hover:text-amber-300 text-xs font-medium"
                    >
                      Guardar
                    </button>
                    <button
                      onClick={() => setEditId(null)}
                      className="text-zinc-400 hover:text-white text-xs"
                    >
                      Cancelar
                    </button>
                  </>
                ) : (
                  <>
                    <span className="flex-1 text-zinc-200 text-sm">{c.name}</span>
                    <button
                      onClick={() => {
                        setEditId(c.id);
                        setEditName(c.name);
                      }}
                      className="text-zinc-400 hover:text-white text-xs transition-colors"
                    >
                      Editar
                    </button>
                    <button
                      onClick={() => handleDelete(c.id)}
                      className="text-red-500 hover:text-red-400 text-xs transition-colors"
                    >
                      Eliminar
                    </button>
                  </>
                )}
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
