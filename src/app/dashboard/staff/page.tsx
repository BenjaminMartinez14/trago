"use client";

import { useEffect, useState } from "react";
import { Plus, Pencil, Trash2, ShieldCheck, ScanLine, Power, KeyRound, Loader2, X } from "lucide-react";
import { toast } from "sonner";

interface StaffMember {
  id: string;
  name: string;
  role: "scanner" | "admin";
  active: boolean;
  created_at: string;
}

const ROLE_LABEL: Record<string, string> = {
  admin:   "Admin",
  scanner: "Scanner",
};

const ROLE_ICON: Record<string, React.ElementType> = {
  admin:   ShieldCheck,
  scanner: ScanLine,
};

// ── PIN input ─────────────────────────────────────────────────────────────────

function PinInput({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  return (
    <input
      type="password"
      inputMode="numeric"
      maxLength={4}
      placeholder="••••"
      value={value}
      onChange={(e) => {
        const v = e.target.value.replace(/\D/g, "").slice(0, 4);
        onChange(v);
      }}
      className="w-full h-11 bg-zinc-900 border border-zinc-700 rounded-xl px-4 text-white text-sm placeholder-zinc-600 focus:outline-none focus:ring-2 focus:ring-trago-orange/40 focus:border-trago-orange/50 tracking-[0.4em] text-center transition-all"
    />
  );
}

// ── Create / Edit modal ───────────────────────────────────────────────────────

function StaffModal({
  initial,
  onSave,
  onClose,
  saving,
}: {
  initial?: Partial<StaffMember>;
  onSave: (data: { name: string; role: string; pin: string }) => void;
  onClose: () => void;
  saving: boolean;
}) {
  const isEdit = !!initial?.id;
  const [name, setName]   = useState(initial?.name ?? "");
  const [role, setRole]   = useState<"scanner" | "admin">(initial?.role ?? "scanner");
  const [pin, setPin]     = useState("");
  const [error, setError] = useState("");

  function handleSubmit() {
    if (!name.trim()) { setError("El nombre es requerido"); return; }
    if (!isEdit && pin.length !== 4) { setError("El PIN debe tener 4 dígitos"); return; }
    if (isEdit && pin.length > 0 && pin.length !== 4) { setError("El PIN debe tener 4 dígitos o dejarlo en blanco para no cambiar"); return; }
    setError("");
    onSave({ name: name.trim(), role, pin });
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70" onClick={onClose}>
      <div
        className="bg-zinc-900 border border-trago-border rounded-2xl w-full max-w-sm p-6 space-y-5"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between">
          <p className="text-white font-semibold text-lg">{isEdit ? "Editar staff" : "Nuevo staff"}</p>
          <button onClick={onClose} className="text-zinc-500 hover:text-white transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="space-y-4">
          <div>
            <label className="text-zinc-400 text-xs font-medium mb-1.5 block">Nombre</label>
            <input
              type="text"
              placeholder="ej: Juan"
              value={name}
              onChange={(e) => setName(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleSubmit()}
              className="w-full h-11 bg-zinc-900 border border-zinc-700 rounded-xl px-4 text-white text-sm placeholder-zinc-600 focus:outline-none focus:ring-2 focus:ring-trago-orange/40 focus:border-trago-orange/50 transition-all"
              autoFocus
            />
          </div>

          <div>
            <label className="text-zinc-400 text-xs font-medium mb-1.5 block">Rol</label>
            <div className="grid grid-cols-2 gap-2">
              {(["scanner", "admin"] as const).map((r) => {
                const Icon = ROLE_ICON[r];
                return (
                  <button
                    key={r}
                    onClick={() => setRole(r)}
                    className={`h-11 flex items-center justify-center gap-2 rounded-xl border font-medium text-sm transition-all ${
                      role === r
                        ? "bg-trago-orange/10 border-trago-orange/50 text-trago-orange"
                        : "bg-zinc-900 border-zinc-700 text-zinc-400 hover:border-zinc-500"
                    }`}
                  >
                    <Icon className="w-4 h-4" />
                    {ROLE_LABEL[r]}
                  </button>
                );
              })}
            </div>
          </div>

          <div>
            <label className="text-zinc-400 text-xs font-medium mb-1.5 block">
              PIN (4 dígitos){isEdit && <span className="text-zinc-600 ml-1">— dejar vacío para no cambiar</span>}
            </label>
            <PinInput value={pin} onChange={setPin} />
          </div>
        </div>

        {error && <p className="text-red-400 text-sm">{error}</p>}

        <button
          onClick={handleSubmit}
          disabled={saving}
          className="w-full h-12 bg-trago-orange text-white font-bold rounded-xl touch-manipulation disabled:opacity-50 flex items-center justify-center gap-2"
        >
          {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
          {isEdit ? "Guardar cambios" : "Crear staff"}
        </button>
      </div>
    </div>
  );
}

// ── Reset PIN modal ───────────────────────────────────────────────────────────

function ResetPinModal({
  member,
  onSave,
  onClose,
  saving,
}: {
  member: StaffMember;
  onSave: (pin: string) => void;
  onClose: () => void;
  saving: boolean;
}) {
  const [pin, setPin] = useState("");
  const [error, setError] = useState("");

  function handleSubmit() {
    if (pin.length !== 4) { setError("El PIN debe tener exactamente 4 dígitos"); return; }
    setError("");
    onSave(pin);
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70" onClick={onClose}>
      <div
        className="bg-zinc-900 border border-trago-border rounded-2xl w-full max-w-sm p-6 space-y-5"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between">
          <p className="text-white font-semibold text-lg">Resetear PIN — {member.name}</p>
          <button onClick={onClose} className="text-zinc-500 hover:text-white transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>
        <div>
          <label className="text-zinc-400 text-xs font-medium mb-1.5 block">Nuevo PIN (4 dígitos)</label>
          <PinInput value={pin} onChange={setPin} />
        </div>
        {error && <p className="text-red-400 text-sm">{error}</p>}
        <button
          onClick={handleSubmit}
          disabled={saving}
          className="w-full h-12 bg-trago-orange text-white font-bold rounded-xl touch-manipulation disabled:opacity-50 flex items-center justify-center gap-2"
        >
          {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
          Actualizar PIN
        </button>
      </div>
    </div>
  );
}

// ── Main page ─────────────────────────────────────────────────────────────────

type Modal =
  | { type: "create" }
  | { type: "edit"; member: StaffMember }
  | { type: "resetPin"; member: StaffMember }
  | { type: "delete"; member: StaffMember }
  | null;

export default function StaffPage() {
  const [staff, setStaff]   = useState<StaffMember[]>([]);
  const [loading, setLoading] = useState(true);
  const [modal, setModal]   = useState<Modal>(null);
  const [saving, setSaving] = useState(false);
  const [apiError, setApiError] = useState("");

  async function fetchStaff() {
    const res = await fetch("/api/dashboard/staff");
    if (res.ok) {
      const d = await res.json();
      setStaff(d.staff ?? []);
    }
  }

  useEffect(() => {
    fetchStaff().finally(() => setLoading(false));
  }, []);

  async function handleCreate(data: { name: string; role: string; pin: string }) {
    setSaving(true); setApiError("");
    const res = await fetch("/api/dashboard/staff", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    });
    if (res.ok) {
      toast.success(`${data.name} agregado`);
      await fetchStaff();
      setModal(null);
    } else {
      const d = await res.json();
      setApiError(d.error ?? "Error al crear");
      toast.error("No se pudo crear el staff");
    }
    setSaving(false);
  }

  async function handleEdit(member: StaffMember, data: { name: string; role: string; pin: string }) {
    setSaving(true); setApiError("");
    const body: Record<string, unknown> = { name: data.name, role: data.role };
    if (data.pin.length === 4) body.pin = data.pin;
    const res = await fetch(`/api/dashboard/staff/${member.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    if (res.ok) {
      toast.success("Cambios guardados");
      await fetchStaff();
      setModal(null);
    } else {
      const d = await res.json();
      setApiError(d.error ?? "Error al editar");
      toast.error("No se pudo guardar");
    }
    setSaving(false);
  }

  async function handleResetPin(member: StaffMember, pin: string) {
    setSaving(true); setApiError("");
    const res = await fetch(`/api/dashboard/staff/${member.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ pin }),
    });
    if (res.ok) {
      toast.success("PIN actualizado");
      await fetchStaff();
      setModal(null);
    } else {
      const d = await res.json();
      setApiError(d.error ?? "Error al resetear PIN");
      toast.error("No se pudo resetear el PIN");
    }
    setSaving(false);
  }

  async function handleToggleActive(member: StaffMember) {
    const res = await fetch(`/api/dashboard/staff/${member.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ active: !member.active }),
    });
    if (res.ok) {
      toast.success(member.active ? `${member.name} desactivado` : `${member.name} activado`);
      await fetchStaff();
    } else {
      toast.error("No se pudo cambiar el estado");
    }
  }

  async function handleDelete(member: StaffMember) {
    setSaving(true);
    const res = await fetch(`/api/dashboard/staff/${member.id}`, { method: "DELETE" });
    if (res.ok) {
      toast.success(`${member.name} eliminado`);
      await fetchStaff();
      setModal(null);
    }
    setSaving(false);
  }

  const activeStaff   = staff.filter((s) => s.active);
  const inactiveStaff = staff.filter((s) => !s.active);

  return (
    <div className="max-w-2xl space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-display">Staff</h1>
        <button
          onClick={() => { setApiError(""); setModal({ type: "create" }); }}
          className="flex items-center gap-2 h-10 px-4 bg-trago-orange text-white font-semibold text-sm rounded-xl touch-manipulation hover:bg-trago-orange/90 transition-colors"
        >
          <Plus className="w-4 h-4" /> Nuevo
        </button>
      </div>

      {apiError && (
        <div className="bg-red-500/10 border border-red-500/20 rounded-xl px-4 py-3">
          <p className="text-red-400 text-sm">{apiError}</p>
        </div>
      )}

      {loading ? (
        <div className="space-y-3">
          {[0, 1, 2].map((i) => (
            <div key={i} className="bg-trago-card rounded-xl h-16 animate-pulse border border-trago-border" />
          ))}
        </div>
      ) : staff.length === 0 ? (
        <div className="bg-trago-card border border-trago-border rounded-xl p-12 text-center">
          <p className="text-trago-muted">No hay staff aún. Crea el primero.</p>
        </div>
      ) : (
        <>
          {activeStaff.length > 0 && (
            <section>
              <p className="text-zinc-500 text-xs uppercase tracking-wide font-semibold mb-2">
                Activos ({activeStaff.length})
              </p>
              <div className="bg-trago-card border border-trago-border rounded-2xl overflow-hidden divide-y divide-trago-border">
                {activeStaff.map((member) => (
                  <StaffRow
                    key={member.id}
                    member={member}
                    onEdit={() => { setApiError(""); setModal({ type: "edit", member }); }}
                    onResetPin={() => { setApiError(""); setModal({ type: "resetPin", member }); }}
                    onToggleActive={() => handleToggleActive(member)}
                    onDelete={() => setModal({ type: "delete", member })}
                  />
                ))}
              </div>
            </section>
          )}

          {inactiveStaff.length > 0 && (
            <section>
              <p className="text-zinc-500 text-xs uppercase tracking-wide font-semibold mb-2">
                Inactivos ({inactiveStaff.length})
              </p>
              <div className="bg-trago-card border border-trago-border rounded-2xl overflow-hidden divide-y divide-trago-border opacity-60">
                {inactiveStaff.map((member) => (
                  <StaffRow
                    key={member.id}
                    member={member}
                    onEdit={() => { setApiError(""); setModal({ type: "edit", member }); }}
                    onResetPin={() => { setApiError(""); setModal({ type: "resetPin", member }); }}
                    onToggleActive={() => handleToggleActive(member)}
                    onDelete={() => setModal({ type: "delete", member })}
                  />
                ))}
              </div>
            </section>
          )}
        </>
      )}

      {/* Modals */}
      {modal?.type === "create" && (
        <StaffModal onSave={handleCreate} onClose={() => setModal(null)} saving={saving} />
      )}
      {modal?.type === "edit" && (
        <StaffModal
          initial={modal.member}
          onSave={(data) => handleEdit(modal.member, data)}
          onClose={() => setModal(null)}
          saving={saving}
        />
      )}
      {modal?.type === "resetPin" && (
        <ResetPinModal
          member={modal.member}
          onSave={(pin) => handleResetPin(modal.member, pin)}
          onClose={() => setModal(null)}
          saving={saving}
        />
      )}
      {modal?.type === "delete" && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70" onClick={() => setModal(null)}>
          <div className="bg-zinc-900 border border-trago-border rounded-2xl w-full max-w-sm p-6 space-y-5" onClick={(e) => e.stopPropagation()}>
            <p className="text-white font-semibold text-lg">¿Eliminar a {modal.member.name}?</p>
            <p className="text-zinc-400 text-sm">Esta acción no se puede deshacer.</p>
            <div className="flex gap-3">
              <button onClick={() => setModal(null)} className="flex-1 h-12 bg-trago-card border border-trago-border text-zinc-300 font-medium rounded-xl">
                Cancelar
              </button>
              <button
                onClick={() => handleDelete(modal.member)}
                disabled={saving}
                className="flex-1 h-12 bg-red-600 text-white font-bold rounded-xl disabled:opacity-50 flex items-center justify-center"
              >
                {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : "Eliminar"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ── Staff row ─────────────────────────────────────────────────────────────────

function StaffRow({
  member, onEdit, onResetPin, onToggleActive, onDelete,
}: {
  member: StaffMember;
  onEdit: () => void;
  onResetPin: () => void;
  onToggleActive: () => void;
  onDelete: () => void;
}) {
  const RoleIcon = ROLE_ICON[member.role];
  return (
    <div className="flex items-center gap-3 px-4 py-3">
      <div className="w-9 h-9 rounded-xl bg-white/5 flex items-center justify-center flex-shrink-0">
        <RoleIcon className="w-4 h-4 text-zinc-400" />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-white font-medium text-sm">{member.name}</p>
        <p className="text-zinc-500 text-xs">{ROLE_LABEL[member.role]}</p>
      </div>
      <div className="flex items-center gap-1 flex-shrink-0">
        <button
          onClick={onResetPin}
          title="Resetear PIN"
          className="w-8 h-8 flex items-center justify-center text-zinc-500 hover:text-white hover:bg-white/5 rounded-lg transition-colors"
        >
          <KeyRound className="w-4 h-4" />
        </button>
        <button
          onClick={onEdit}
          title="Editar"
          className="w-8 h-8 flex items-center justify-center text-zinc-500 hover:text-white hover:bg-white/5 rounded-lg transition-colors"
        >
          <Pencil className="w-4 h-4" />
        </button>
        <button
          onClick={onToggleActive}
          title={member.active ? "Desactivar" : "Activar"}
          className={`w-8 h-8 flex items-center justify-center rounded-lg transition-colors ${member.active ? "text-trago-green hover:bg-trago-green/10" : "text-zinc-600 hover:text-trago-green hover:bg-trago-green/10"}`}
        >
          <Power className="w-4 h-4" />
        </button>
        <button
          onClick={onDelete}
          title="Eliminar"
          className="w-8 h-8 flex items-center justify-center text-zinc-600 hover:text-red-400 hover:bg-red-500/10 rounded-lg transition-colors"
        >
          <Trash2 className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}
