import Link from "next/link";
import { GUARANTEE_DAYS, PRODUCTS, type ProductId } from "@/lib/products";
import { brl } from "@/lib/format";

// Página inicial. Cada zip mostra só o seu app (NEXT_PUBLIC_APP); no computador aparecem os dois.
const ONLY = process.env.NEXT_PUBLIC_APP as ProductId | undefined;

export default function Home() {
  const apps = Object.values(PRODUCTS).filter((p) => !ONLY || p.id === ONLY);
  const single = apps.length === 1 ? apps[0] : null;
  return (
    <div className="public" data-app={single?.id}>
      <header className="row between">
        <span className="brandmark">{single ? single.name : "Cobrança e Sobra"}</span>
        <Link className="btn ghost sm" href={`${single?.home ?? "/cobranca/"}`}>Entrar</Link>
      </header>

      <section className="stack" style={{ gap: 16, maxWidth: 640 }}>
        <h1 className="landing-h1">{single ? single.tagline : "Apps simples para quem trabalha por conta própria."}</h1>
        <p className="lead" style={{ fontSize: 18 }}>Você assina, usa sozinho no celular e começa em menos de 5 minutos. Sem planilha e sem instalar nada.</p>
      </section>

      <section className="apps">
        {apps.map((p) => (
          <article key={p.id} className="card" data-app={p.id} style={{ gap: 14 }}>
            <span className="pill accent" style={{ alignSelf: "flex-start", whiteSpace: "normal", height: "auto", padding: "6px 12px", lineHeight: 1.35 }}>{p.audience}</span>
            <h2 style={{ fontSize: 28, fontWeight: 800 }}>{p.name}</h2>
            {!single && <p className="lead">{p.tagline}</p>}
            <div className="stack" style={{ gap: 8 }}>
              {p.benefits.map((b) => <span key={b} className="check">{b}</span>)}
              <span className="check">Garantia de {GUARANTEE_DAYS} dias: não gostou, pede o dinheiro de volta no app</span>
            </div>
            <p className="muted">A partir de {brl(Math.min(...p.prices))} por mês{p.yearlyPrice ? ` ou ${brl(p.yearlyPrice)} por ano` : ""}. Preço travado por 12 meses.</p>
            <Link className="btn" href={p.home}>Assinar</Link>
          </article>
        ))}
      </section>

      <footer className="muted small">O dinheiro dos seus clientes vai direto para a sua conta pelo Pix. O app não toca nele.</footer>
    </div>
  );
}
