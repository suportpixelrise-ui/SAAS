import type { Metadata, Viewport } from "next";
import { Inter, Plus_Jakarta_Sans } from "next/font/google";
import "./globals.css";

const inter = Inter({ subsets: ["latin"], variable: "--f-inter", display: "swap" });
const jakarta = Plus_Jakarta_Sans({ subsets: ["latin"], weight: ["600", "700", "800"], variable: "--f-jakarta", display: "swap" });
const APP = process.env.NEXT_PUBLIC_APP === "sobra" ? "Sobra" : process.env.NEXT_PUBLIC_APP === "cobranca" ? "Cobrança" : "Cobrança e Sobra";

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
    { media: "(prefers-color-scheme: light)", color: "#F7F7FA" },
    { media: "(prefers-color-scheme: dark)", color: "#0F0F14" },
  ],
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="pt-BR" className={`${inter.variable} ${jakarta.variable}`}>
      <head>
        {/* Endereço e chave pública do Supabase. */}
        <script src="/config.js" />
      </head>
      <body style={{ ["--font-body" as string]: "var(--f-inter), system-ui, sans-serif", ["--font-display" as string]: "var(--f-jakarta), var(--f-inter), sans-serif" }}>
        {children}
      </body>
    </html>
  );
}
