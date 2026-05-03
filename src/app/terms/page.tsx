import Footer from "@/components/Footer";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";

export const metadata = { title: "Términos y condiciones — Trago" };

export default function TermsPage() {
  return (
    <div className="min-h-screen bg-trago-black flex flex-col">
      <header className="px-4 h-14 flex items-center gap-3 border-b border-trago-border">
        <Link href="/" className="w-10 h-10 flex items-center justify-center text-white rounded-xl hover:bg-white/5 transition-colors -ml-1">
          <ArrowLeft className="w-5 h-5" />
        </Link>
        <h1 className="text-lg font-display text-white">Términos y condiciones</h1>
      </header>

      <main className="flex-1 max-w-2xl mx-auto px-4 py-8 text-zinc-300 text-sm space-y-5 leading-relaxed">
        <p className="text-trago-muted">Última actualización: {new Date().toLocaleDateString("es-CL")}</p>

        <section className="space-y-2">
          <h2 className="text-white font-display text-xl">1. Servicio</h2>
          <p>Trago es una plataforma que conecta a clientes con locales nocturnos, permitiendo realizar pedidos y pagos digitales. Los productos son ofrecidos directamente por el local; Trago actúa solo como intermediario tecnológico.</p>
        </section>

        <section className="space-y-2">
          <h2 className="text-white font-display text-xl">2. Pedidos y pagos</h2>
          <p>Al confirmar un pedido aceptas el precio mostrado. Los pagos se procesan a través de Mercado Pago. El producto se entrega al mostrar el código QR en la barra del local.</p>
        </section>

        <section className="space-y-2">
          <h2 className="text-white font-display text-xl">3. Edad mínima</h2>
          <p>Para comprar productos con alcohol debes tener al menos 18 años. El local puede solicitar identificación al momento de la entrega y rechazar el servicio si no se cumple este requisito.</p>
        </section>

        <section className="space-y-2">
          <h2 className="text-white font-display text-xl">4. Cancelaciones y reembolsos</h2>
          <p>Si un producto no está disponible al momento de la entrega, el local realizará el reembolso a través de Mercado Pago. Los pedidos no retirados durante el evento pueden ser cancelados por el local.</p>
        </section>

        <section className="space-y-2">
          <h2 className="text-white font-display text-xl">5. Responsabilidad</h2>
          <p>Trago no se responsabiliza por la calidad de los productos ofrecidos por el local, problemas en la entrega o disputas entre el cliente y el local. Para reclamos relacionados con productos, contacta directamente al local.</p>
        </section>

        <section className="space-y-2">
          <h2 className="text-white font-display text-xl">6. Modificaciones</h2>
          <p>Podemos actualizar estos términos en cualquier momento. La versión vigente aparece siempre en esta página.</p>
        </section>
      </main>

      <Footer />
    </div>
  );
}
