import type { Metadata, Viewport } from "next";
import { Poppins, Righteous } from "next/font/google";
import "./globals.css";

const poppins = Poppins({
  subsets: ["latin"],
  weight: ["300", "400", "500", "600", "700"],
  variable: "--font-poppins",
  display: "swap",
});

const righteous = Righteous({
  subsets: ["latin"],
  weight: "400",
  variable: "--font-righteous",
  display: "swap",
});

export const viewport: Viewport = {
  themeColor: "#050505",
  width: "device-width",
  initialScale: 1,
};

const TITLE = "Trago — Ordena sin filas";
const DESCRIPTION = "Ordena y paga desde tu celular en el bar. Apple Pay, Google Pay y tarjeta. Sin filas, sin fricción.";
const SITE = process.env.NEXT_PUBLIC_BASE_URL ?? "https://trago-app.vercel.app";

export const metadata: Metadata = {
  metadataBase: new URL(SITE),
  title: { default: TITLE, template: "%s — Trago" },
  description: DESCRIPTION,
  manifest: "/manifest.json",
  icons: {
    icon: [
      { url: "/icons/icon-192.png", sizes: "192x192", type: "image/png" },
      { url: "/icons/icon-512.png", sizes: "512x512", type: "image/png" },
    ],
    apple: [
      { url: "/icons/apple-touch-icon.png", sizes: "180x180", type: "image/png" },
    ],
  },
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "Trago",
  },
  openGraph: {
    type: "website",
    locale: "es_CL",
    siteName: "Trago",
    title: TITLE,
    description: DESCRIPTION,
    url: SITE,
    images: [{ url: "/og-image.png", width: 1200, height: 630, alt: "Trago" }],
  },
  twitter: {
    card: "summary_large_image",
    title: TITLE,
    description: DESCRIPTION,
    images: ["/og-image.png"],
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="es" className="dark">
      <body
        className={`${poppins.variable} ${righteous.variable} font-sans antialiased bg-trago-black text-white`}
      >
        {children}
      </body>
    </html>
  );
}
