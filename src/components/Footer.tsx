import Link from "next/link";

export default function Footer() {
  return (
    <footer className="border-t border-trago-border mt-12 py-6 px-4">
      <div className="max-w-4xl mx-auto flex flex-wrap justify-center items-center gap-x-5 gap-y-2 text-xs text-trago-muted">
        <span>© {new Date().getFullYear()} Trago</span>
        <Link href="/privacy" className="hover:text-white transition-colors">Privacidad</Link>
        <Link href="/terms" className="hover:text-white transition-colors">Términos</Link>
        <Link href="/contact" className="hover:text-white transition-colors">Contacto</Link>
      </div>
    </footer>
  );
}
