"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { addDays, brl, shortDate, today } from "@/lib/format";
import { orderRest, priceProduct, upcomingOrders } from "@/lib/sobra-core";
import { dismissAlert } from "@/lib/sobra-data";
import { Empty, Icon, Notice } from "@/components/ui";
import { useSob } from "./SobData";
import { orderHref, productHref, SobShell, withSuspense } from "./shell";

function Inicio() {
  const qs = useSearchParams();
  const { products, ingMap, profile, orders, alerts } = useSob();
  const ref = today();
  const week = upcomingOrders(orders, 7, ref);
  const toReceive = week.reduce((s, o) => s + orderRest(o), 0);
  const priced = products.map((p) => priceProduct(p, ingMap, profile!)).filter((p) => p.profit != null);
  const worst = priced.sort((a, b) => (a.profitPct ?? 0) - (b.profitPct ?? 0))[0];

  return (
    <SobShell active="inicio">
      {qs.get("assinou") && <Notice kind="ok">Assinatura ativa. Obrigado por assinar!</Notice>}
      <div className="row between">
        <span className="label">Sobra</span>
        <Link className="btn ghost sm" href="/sobra/ajustes/" aria-label="Ajustes"><Icon name="settings" size={18} /></Link>
      </div>

      {products.length === 0 ? (
        <Empty icon="cake" title="Calcule o preço do seu primeiro produto" text="Escolha um modelo, coloque quanto pagou nos insumos e veja o custo e o lucro de cada unidade." action={<Link className="btn" href="/sobra/produtos/novo/">Começar</Link>} />
      ) : (
        <>
          <section className="hero">
            <span className="label">Entregas nos próximos 7 dias</span>
            <span className="big">{week.length} {week.length === 1 ? "encomenda" : "encomendas"}</span>
            <span className="muted">{toReceive > 0 ? `Falta receber ${brl(toReceive)}` : "Tudo recebido"}</span>
          </section>

          {alerts.map((a) => (
            <div className="alert warn stack" style={{ gap: 6 }} key={a.ingredient.id}>
              <b>{a.ingredient.name} subiu {Math.round(a.risePct)}%</b>
              {a.products.length
                ? <span>{a.products.map((x) => `${x.name}: ${brl(Math.round(-x.deltaPerUnit))} a menos de lucro por unidade`).join(" · ")}</span>
                : <span>Nenhum produto usa esse insumo ainda.</span>}
              <div className="row" style={{ gap: 12 }}>
                {a.products[0] && <Link href={productHref(a.products[0].id)} style={{ color: "inherit", fontWeight: 600 }}>Rever preço</Link>}
                <button className="link-btn" style={{ color: "inherit", minHeight: 0, padding: 0 }} onClick={() => dismissAlert(a.ingredient.id)}>Entendi</button>
              </div>
            </div>
          ))}

          {week.length > 0 && (
            <section className="card">
              <h2>Próximas entregas</h2>
              <div className="list">
                {week.slice(0, 5).map((o) => {
                  const rest = orderRest(o);
                  return (
                    <Link className="item" href={orderHref(o.id)} key={o.id}>
                      <div className="grow">
                        <div className="t">{o.deliveryDate === ref ? "Hoje" : o.deliveryDate === addDays(ref, 1) ? "Amanhã" : shortDate(o.deliveryDate)} · {o.customerName}</div>
                        <div className="s">{o.items.map((i) => `${i.name} ×${i.qty}`).join(", ")}</div>
                      </div>
                      <span className={`pill ${rest <= 0 ? "ok" : o.depositCents > 0 ? "warn" : ""}`}>{rest <= 0 ? "Pago" : `falta ${brl(rest)}`}</span>
                    </Link>
                  );
                })}
              </div>
            </section>
          )}

          {worst && (
            <Link href={productHref(worst.id)} className="card" style={{ textDecoration: "none", color: "inherit" }}>
              <span className="label">Produto que menos dá lucro</span>
              <div className="row between">
                <b>{worst.name}</b>
                <span className={`pill ${(worst.profit ?? 0) >= 0 ? "warn" : "bad"}`}>{(worst.profit ?? 0) >= 0 ? `lucro de ${Math.round(worst.profitPct ?? 0)}%` : "dá prejuízo"}</span>
              </div>
              <span className="muted small">Toque para rever o preço.</span>
            </Link>
          )}

          <div className="grid2">
            <Link className="btn ghost" href="/sobra/produtos/novo/">+ Produto</Link>
            <Link className="btn ghost" href="/sobra/encomendas/nova/">+ Encomenda</Link>
          </div>
        </>
      )}
    </SobShell>
  );
}

export default withSuspense(Inicio);
