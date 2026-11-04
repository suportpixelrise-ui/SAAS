import Link from "next/link";
import type { ReactNode } from "react";
import { ajudaLink, EMPRESA, ROTULOS, SUPORTE_TEXTO, TERMOS_VERSAO, type CampoEmpresa } from "@/lib/empresa";
import { fullDate } from "@/lib/format";
import { PRODUCTS, type ProductId } from "@/lib/products";

/** O app deste site. Cada site publicado tem o seu. */
export const appDoSite = (): ProductId => (process.env.NEXT_PUBLIC_APP === "sobra" ? "sobra" : "cobranca");

/** Dado da empresa. Vazio, sai destacado para lembrar de preencher. */
export function Campo({ k }: { k: CampoEmpresa }) {
  return EMPRESA[k] ? <>{EMPRESA[k]}</> : <mark>[{ROTULOS[k]}]</mark>;
}

/** Contato do suporte, com link para o WhatsApp. */
export function Suporte() {
  return <a href={ajudaLink(PRODUCTS[appDoSite()].name)} target="_blank" rel="noopener">WhatsApp {SUPORTE_TEXTO}</a>;
}

export function LegalPage({ title, children }: { title: string; children: ReactNode }) {
  const app = appDoSite();
  return (
    <div className="site night" data-app={app}>
    <main className="legal">
      <Link className="brandmark" href="/">{PRODUCTS[app].name}</Link>
      <h1>{title}</h1>
      <p className="muted">Versão de {fullDate(TERMOS_VERSAO)}.</p>
      {children}
      <nav className="legal-nav" aria-label="Documentos">
        <Link href="/termos/">Termos de uso</Link>
        <Link href="/privacidade/">Política de privacidade</Link>
        <Link href="/">Voltar ao site</Link>
      </nav>
    </main>
    </div>
  );
}
