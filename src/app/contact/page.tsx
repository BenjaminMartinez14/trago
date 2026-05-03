import Footer from "@/components/Footer";
import Link from "next/link";
import { ArrowLeft, Mail, Instagram } from "lucide-react";

export const metadata = { title: "Contacto — Trago" };

export default function ContactPage() {
  return (
    <div className="min-h-screen bg-trago-black flex flex-col">
      <header className="px-4 h-14 flex items-center gap-3 border-b border-trago-border">
        <Link href="/" className="w-10 h-10 flex items-center justify-center text-white rounded-xl hover:bg-white/5 transition-colors -ml-1">
          <ArrowLeft className="w-5 h-5" />
        </Link>
        <h1 className="text-lg font-display text-white">Contacto</h1>
      </header>

      <main className="flex-1 max-w-2xl mx-auto px-4 py-10 w-full">
        <div className="text-center mb-8">
          <h2 className="text-white font-display text-3xl mb-2">Hablemos</h2>
          <p className="text-trago-muted text-sm">¿Tienes un local? ¿Una duda? ¿Una idea?</p>
        </div>

        <div className="space-y-3 max-w-sm mx-auto">
          <a
            href="mailto:hola@trago.cl"
            className="flex items-center gap-4 bg-trago-card border border-trago-border rounded-2xl px-5 py-4 hover:border-trago-orange/50 transition-all group"
          >
            <div className="w-10 h-10 rounded-xl bg-trago-orange/10 border border-trago-orange/20 flex items-center justify-center">
              <Mail className="w-5 h-5 text-trago-orange" />
            </div>
            <div>
              <p className="text-trago-muted text-xs uppercase tracking-wide">Email</p>
              <p className="text-white font-medium group-hover:text-trago-orange transition-colors">hola@trago.cl</p>
            </div>
          </a>

          <a
            href="https://instagram.com/trago.cl"
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-4 bg-trago-card border border-trago-border rounded-2xl px-5 py-4 hover:border-trago-orange/50 transition-all group"
          >
            <div className="w-10 h-10 rounded-xl bg-trago-orange/10 border border-trago-orange/20 flex items-center justify-center">
              <Instagram className="w-5 h-5 text-trago-orange" />
            </div>
            <div>
              <p className="text-trago-muted text-xs uppercase tracking-wide">Instagram</p>
              <p className="text-white font-medium group-hover:text-trago-orange transition-colors">@trago.cl</p>
            </div>
          </a>
        </div>

        <p className="text-trago-muted text-xs text-center mt-10">
          Respondemos en menos de 24 horas hábiles.
        </p>
      </main>

      <Footer />
    </div>
  );
}
