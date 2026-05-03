import Footer from "@/components/Footer";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";

export const metadata = { title: "Política de privacidad — Trago" };

export default function PrivacyPage() {
  return (
    <div className="min-h-screen bg-trago-black flex flex-col">
      <header className="px-4 h-14 flex items-center gap-3 border-b border-trago-border">
        <Link href="/" className="w-10 h-10 flex items-center justify-center text-white rounded-xl hover:bg-white/5 transition-colors -ml-1">
          <ArrowLeft className="w-5 h-5" />
        </Link>
        <h1 className="text-lg font-display text-white">Política de privacidad</h1>
      </header>

      <main className="flex-1 max-w-2xl mx-auto px-4 py-8 text-zinc-300 text-sm space-y-5 leading-relaxed">
        <p className="text-trago-muted">Última actualización: {new Date().toLocaleDateString("es-CL")}</p>

        <section className="space-y-2">
          <h2 className="text-white font-display text-xl">1. Datos que recopilamos</h2>
          <p>Para procesar tu pedido recopilamos: identificadores de sesión anónimos, productos seleccionados, monto pagado y datos de pago gestionados por Mercado Pago. No almacenamos información de tarjetas de crédito.</p>
        </section>

        <section className="space-y-2">
          <h2 className="text-white font-display text-xl">2. Uso de los datos</h2>
          <p>Usamos los datos exclusivamente para: completar tu compra, mostrar el estado del pedido al barman, generar reportes operativos para el local, y cumplir con obligaciones legales chilenas (Ley 19.628 sobre protección de la vida privada).</p>
        </section>

        <section className="space-y-2">
          <h2 className="text-white font-display text-xl">3. Almacenamiento</h2>
          <p>Los datos se almacenan en Supabase (servidores en EE.UU.) y Mercado Pago. Conservamos información de pedidos por 12 meses para fines contables y luego se eliminan o anonimizan.</p>
        </section>

        <section className="space-y-2">
          <h2 className="text-white font-display text-xl">4. Tus derechos</h2>
          <p>Puedes solicitar acceso, rectificación o eliminación de tus datos escribiendo a <Link href="/contact" className="text-trago-orange hover:underline">contacto</Link>. Procesamos solicitudes en un plazo máximo de 30 días.</p>
        </section>

        <section className="space-y-2">
          <h2 className="text-white font-display text-xl">5. Cookies</h2>
          <p>Usamos almacenamiento local del navegador (sessionStorage / localStorage) para mantener tu carrito y sesión. No usamos cookies de terceros para tracking publicitario.</p>
        </section>
      </main>

      <Footer />
    </div>
  );
}
