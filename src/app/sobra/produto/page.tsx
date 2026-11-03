"use client";

import Link from "next/link";
import { useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { errorText } from "@/lib/supabase";
import { brl } from "@/lib/format";
import { profit, suggestedPrice } from "@/lib/sobra-calc";
import { priceProduct } from "@/lib/sobra-core";
import { deleteProduct, dismissAlert, setSalePrice } from "@/lib/sobra-data";
import { ErrorBox, Notice } from "@/components/ui";
import { useSob } from "../SobData";
import { NotFound, productHref, SobShell, withSuspense } from "../shell";

const MARGINS = [20, 30, 50, 80, 100, 150];

function Produto() {
  const router = useRouter();
  const qs = useSearchParams();
  const id = qs.get("id") ?? "";
  const { products, ingMap, profile, alerts } = useSob();
  const [margin, setMargin] = useState<number | undefined>(undefined);
  const [flash, setFlash] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const p = products.find((x) => x.id === id);
  if (!p) return <NotFound what="Produto" back="/sobra/produtos/" />;

  const pr = priceProduct(p, ingMap, profile!, margin);
  const parts = [
    { label: "Ingredientes", v: pr.cost.ingredients, color: "var(--accent)" },
    { label: "Embalagem", v: pr.cost.packaging, color: "color-mix(in srgb, var(--accent) 55%, white)" },
    { label: "Gás", v: pr.cost.gas, color: "color-mix(in srgb, var(--accent) 25%, white)" },
    { label: "Seu trabalho", v: pr.cost.work, color: "var(--text)" },
  ];
  const sug = suggestedPrice(pr.cost.total, pr.margin);
  const sugProfit = profit(sug, pr.cost.total).value;
  const mine = alerts.filter((a) => a.products.some((x) => x.id === id));

  async function act(fn: () => Promise<unknown>, msg?: string) {
    setBusy(true);
    setError(null);
    try {
      await fn();
      if (msg) setFlash(msg);
    } catch (err) {
      setError(errorText(err));
    } finally {
      setBusy(false);
    }
  }

  return (
    <SobShell back={{ href: "/sobra/produtos/", label: "Produtos" }}>
      {qs.get("novo") && !flash && <Notice kind="ok">Produto salvo. Este é o seu preço.</Notice>}
      {qs.get("salvo") && !flash && <Notice kind="ok">Alterações salvas.</Notice>}
      {flash && <Notice kind="ok">{flash}</Notice>}
      <ErrorBox error={error} />
      {mine.map((a) => (
        <div className="alert warn" key={a.ingredient.id}>
          {a.ingredient.name} subiu {Math.round(a.risePct)}%. Isso tira {brl(Math.round(-a.products.find((x) => x.id === id)!.deltaPerUnit))} do lucro de cada unidade.{" "}
          <button className="link-btn" style={{ minHeight: 0, padding: 0, color: "inherit", textDecoration: "underline" }} onClick={() => dismissAlert(a.ingredient.id)}>Entendi</button>
        </div>
      ))}

      <div className="stack" style={{ gap: 2 }}>
        <h1 className="page-title">{p.name}</h1>
        <span className="muted">a receita rende {p.yieldUnits} {p.yieldUnits === 1 ? "unidade" : "unidades"}</span>
      </div>

      <section className="hero">
        <span className="label">Custa para fazer cada um</span>
        <span className="big">{brl(Math.round(pr.cost.total))}</span>
      </section>

      <section className="card" style={{ gap: 10 }}>
        <div style={{ display: "flex", height: 10, borderRadius: 99, overflow: "hidden", gap: 2 }} role="img" aria-label="Divisão do custo">
          {parts.filter((x) => x.v > 0).map((x) => <i key={x.label} style={{ width: `${(x.v / (pr.cost.total || 1)) * 100}%`, background: x.color }} />)}
        </div>
        {parts.map((x) => (
          <div className="kv" key={x.label}>
            <span className="row" style={{ gap: 8 }}><i aria-hidden="true" style={{ width: 10, height: 10, borderRadius: 3, background: x.color, border: "1px solid var(--border)" }} />{x.label}</span>
            <b>{brl(Math.round(x.v))}</b>
          </div>
        ))}
      </section>

      {p.salePriceCents != null && pr.profit != null && (
        <div className={`alert ${pr.profit >= 0 ? "ok" : "bad"}`}>
          Vendendo a <b>{brl(p.salePriceCents)}</b>, você {pr.profit >= 0 ? "lucra" : "perde"} <b>{brl(Math.abs(Math.round(pr.profit)))}</b> em cada um
          {pr.profit >= 0 ? ` (${Math.round(pr.profitPct!)}% do preço).` : ". Esse preço não cobre o custo."}
        </div>
      )}

      <section className="card">
        <div className="row between" style={{ alignItems: "flex-start" }}>
          <div className="stack" style={{ gap: 2 }}>
            <span className="label">Preço sugerido</span>
            <span className="big md" style={{ color: "var(--accent-strong)" }}>{brl(sug)}</span>
          </div>
          <span className="muted small" style={{ textAlign: "right" }}>lucro de<br /><b className="num">{brl(Math.round(sugProfit))}</b> em cada</span>
        </div>
        <div className="pills" role="radiogroup" aria-label="Quanto de lucro">
          {MARGINS.map((m) => (
            <button key={m} type="button" role="radio" aria-checked={m === pr.margin} className={`pill ${m === pr.margin ? "accent" : ""}`} style={{ border: 0, cursor: "pointer" }} onClick={() => setMargin(m)}>+{m}%</button>
          ))}
        </div>
        <button className="btn" disabled={busy} onClick={() => act(() => setSalePrice(id, sug, pr.margin), "Preço de venda atualizado.")}>Usar este preço</button>
      </section>

      <section className="card">
        <h2>Insumos da receita</h2>
        <div className="list">
          {pr.priced.map((it) => (
            <div className="item" key={it.ingredientId} style={{ minHeight: 44 }}>
              <span className="grow">{it.ingredient.name}</span>
              <span className="muted num">{String(it.qty).replace(".", ",")} {it.ingredient.unit === "kg" ? "g" : it.ingredient.unit === "l" ? "ml" : it.ingredient.unit === "un" ? "un." : it.ingredient.unit}</span>
            </div>
          ))}
        </div>
      </section>

      <div className="actions">
        <Link className="btn ghost" href={productHref(id, "editar")}>Editar receita</Link>
        <details>
          <summary className="link-btn" style={{ color: "var(--bad)", listStyle: "none", textAlign: "center" }}>Apagar produto</summary>
          <button className="btn danger" style={{ marginTop: 8 }} disabled={busy} onClick={() => act(async () => { await deleteProduct(id); router.replace("/sobra/produtos/?removido=1"); })}>Sim, apagar {p.name}</button>
        </details>
      </div>
    </SobShell>
  );
}

export default withSuspense(Produto);
