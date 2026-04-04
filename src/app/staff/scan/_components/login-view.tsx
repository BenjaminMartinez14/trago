"use client";

import { useState, useEffect } from "react";

type StaffSession = {
  token: string;
  name: string;
  role: "scanner" | "admin";
  venueId: string;
};

const PIN_LENGTH = 4;

export default function LoginView({ onSuccess }: { onSuccess: (s: StaffSession) => void }) {
  const [venueSlug, setVenueSlug] = useState("");
  const [pin, setPin] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  function handleKey(digit: string) {
    if (pin.length < PIN_LENGTH) setPin((p) => p + digit);
  }

  function handleDelete() {
    setPin((p) => p.slice(0, -1));
  }

  async function handleSubmit() {
    if (pin.length !== PIN_LENGTH || !venueSlug.trim()) return;
    setLoading(true);
    setError("");

    try {
      const res = await fetch("/api/staff/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ venueSlug: venueSlug.trim(), pin }),
      });

      if (res.status === 401) {
        setError("PIN o local incorrecto");
        setPin("");
        setLoading(false);
        return;
      }
      if (!res.ok) {
        setError("Error de servidor");
        setPin("");
        setLoading(false);
        return;
      }

      const data = await res.json();
      onSuccess(data as StaffSession);
    } catch {
      setError("Error de conexión");
      setPin("");
      setLoading(false);
    }
  }

  // Auto-submit when PIN is complete
  useEffect(() => {
    if (pin.length === PIN_LENGTH && venueSlug.trim()) {
      handleSubmit();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pin]);

  const keys = ["1", "2", "3", "4", "5", "6", "7", "8", "9", "", "0", "⌫"];

  return (
    <div className="min-h-screen bg-trago-black flex flex-col items-center justify-center px-6 gap-8">
      <div className="text-center">
        <p className="text-white font-display text-2xl mb-1">Staff — Trago</p>
        <p className="text-trago-muted text-sm">Ingresa con tu PIN</p>
      </div>

      <input
        type="text"
        value={venueSlug}
        onChange={(e) => setVenueSlug(e.target.value.toLowerCase().replace(/\s/g, "-"))}
        placeholder="Slug del local (ej: club-demo)"
        className="w-full max-w-xs bg-trago-card text-white placeholder-zinc-600 rounded-xl px-4 h-12 text-sm border border-trago-border focus:outline-none focus:ring-2 focus:ring-trago-orange/30 focus:border-trago-orange/50 transition-all"
      />

      <div className="flex gap-4">
        {Array.from({ length: PIN_LENGTH }).map((_, i) => (
          <div
            key={i}
            className={`w-4 h-4 rounded-full border-2 transition-all duration-200 ${
              i < pin.length
                ? "bg-trago-orange border-trago-orange glow-orange-sm"
                : "border-zinc-600"
            }`}
          />
        ))}
      </div>

      {error && <p className="text-red-400 text-sm">{error}</p>}

      <div className="grid grid-cols-3 gap-3 w-full max-w-xs">
        {keys.map((key, idx) => {
          if (key === "") return <div key={idx} />;
          if (key === "⌫") {
            return (
              <button
                key={idx}
                onClick={handleDelete}
                disabled={loading}
                className="h-16 bg-trago-card text-white text-2xl rounded-2xl flex items-center justify-center touch-manipulation press-scale border border-trago-border disabled:opacity-40"
              >
                ⌫
              </button>
            );
          }
          return (
            <button
              key={idx}
              onClick={() => handleKey(key)}
              disabled={loading || pin.length === PIN_LENGTH}
              className="h-16 bg-zinc-800 text-white text-2xl font-semibold rounded-2xl flex items-center justify-center touch-manipulation active:bg-zinc-700 disabled:opacity-40"
            >
              {loading && pin.length === PIN_LENGTH ? (
                <span className="w-5 h-5 border-2 border-zinc-500 border-t-white rounded-full animate-spin" />
              ) : (
                key
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}
