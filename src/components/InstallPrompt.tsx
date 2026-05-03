"use client";

import { useEffect, useState } from "react";
import { Download, X } from "lucide-react";

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}

const DISMISS_KEY = "trago_install_dismissed_at";
const RE_PROMPT_AFTER_DAYS = 7;

export default function InstallPrompt() {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined") return;

    // Already installed?
    if (window.matchMedia("(display-mode: standalone)").matches) return;

    // Recently dismissed?
    const dismissedAt = Number(localStorage.getItem(DISMISS_KEY) ?? "0");
    if (dismissedAt && Date.now() - dismissedAt < RE_PROMPT_AFTER_DAYS * 24 * 60 * 60 * 1000) return;

    function onBeforeInstall(e: Event) {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
      // Show after a short delay so it doesn't block initial paint
      setTimeout(() => setVisible(true), 3000);
    }

    window.addEventListener("beforeinstallprompt", onBeforeInstall);
    return () => window.removeEventListener("beforeinstallprompt", onBeforeInstall);
  }, []);

  async function handleInstall() {
    if (!deferredPrompt) return;
    await deferredPrompt.prompt();
    await deferredPrompt.userChoice;
    setDeferredPrompt(null);
    setVisible(false);
    localStorage.setItem(DISMISS_KEY, String(Date.now()));
  }

  function handleDismiss() {
    setVisible(false);
    localStorage.setItem(DISMISS_KEY, String(Date.now()));
  }

  if (!visible || !deferredPrompt) return null;

  return (
    <div className="fixed top-4 left-4 right-4 z-40 max-w-md mx-auto animate-slide-up">
      <div className="bg-trago-card border border-trago-orange/40 rounded-2xl p-4 shadow-2xl flex items-center gap-3 backdrop-blur">
        <div className="w-11 h-11 rounded-xl bg-trago-orange/10 border border-trago-orange/30 flex items-center justify-center flex-shrink-0">
          <Download className="w-5 h-5 text-trago-orange" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-white font-semibold text-sm">Instalar Trago</p>
          <p className="text-zinc-400 text-xs">Acceso rápido desde tu pantalla principal</p>
        </div>
        <button
          onClick={handleInstall}
          className="px-3 py-1.5 bg-trago-orange text-white text-xs font-bold rounded-lg touch-manipulation press-scale flex-shrink-0"
        >
          Instalar
        </button>
        <button
          onClick={handleDismiss}
          aria-label="Cerrar"
          className="w-8 h-8 flex items-center justify-center text-zinc-500 hover:text-white transition-colors flex-shrink-0"
        >
          <X className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}
