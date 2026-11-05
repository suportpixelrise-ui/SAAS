import type { Metadata, Viewport } from "next";
import { Instrument_Serif, Mona_Sans } from "next/font/google";
import { Pixel } from "@/components/Pixel";
import "./globals.css";

const mona = Mona_Sans({ subsets: ["latin"], axes: ["wdth"], variable: "--f-mona", display: "swap" });
const serif = Instrument_Serif({ subsets: ["latin"], weight: "400", style: "italic", variable: "--f-serif", display: "swap" });
const APP = process.env.NEXT_PUBLIC_APP === "sobra" ? "Sobra" : process.env.NEXT_PUBLIC_APP === "cobranca" ? "Facilita IA" : "Facilita IA e Sobra";

export const metadata: Metadata = {
  title: { default: APP, template: `%s · ${APP}` },
  description: "Apps simples para quem trabalha por conta própria: cobrar clientes fixos e calcular o preço certo.",
  manifest: "/manifest.webmanifest",
  icons: { icon: "/icone.svg" },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#F3F3FB" },
    { media: "(prefers-color-scheme: dark)", color: "#060609" },
  ],
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="pt-BR" className={`${mona.variable} ${serif.variable}`}>
      <head>
        {/* Endereço e chave pública do Supabase. */}
        <script src="/config.js" />
      </head>
      <body>{children}<Pixel /></body>
    </html>
  );
}
