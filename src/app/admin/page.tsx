"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { call, errorText } from "@/lib/supabase";
import { useUser } from "@/lib/session";
import { PRODUCTS, type ProductId } from "@/lib/products";
import { brl, fullDate } from "@/lib/format";
import { Loading, Notice } from "@/components/ui";

// Tela do dono: quem assinou, situação e quanto entra por mês.
// Quem não é administrador recebe a recusa do servidor; esta página não guarda nenhum dado.

interface Row {
  email: string; product: ProductId; status: "pendente" | "ativa" | "cancelada" | "reembolsada"; cycle: "mensal" | "anual";
  price_cents: number; provider: string; created_at: string; paid_at: string | null; current_period_end: string | null;
  access_until: string | null; canceled_at: string | null; refunded_at: string | null;
}

const STATUS: Record<Row["status"], { label: string; kind: string }> = {
  ativa: { label: "Ativa", kind: "ok" },
  pendente: { label: "Esperando pagamento", kind: "warn" },
  cancelada: { label: "Cancelada", kind: "" },
  reembolsada: { label: "Reembolsada", kind: "bad" },
};

const day = (iso: string | null) => (iso ? fullDate(iso.slice(0, 10)) : "");
const monthly = (r: Row) => (r.cycle === "anual" ? Math.round(r.price_cents / 12) : r.price_cents);

export default function Admin() {
  const router = useRouter();
  const { loading, user } = useUser();
  const [data, setData] = useState<{ contas: number; assinaturas: Row[] } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [app, setApp] = useState("todos");
  const [status, setStatus] = useState("todos");

  useEffect(() => {
    if (loading) return;
    if (!user) return router.replace("/entrar/?volta=/admin/");
    call<{ contas: number; assinaturas: Row[] }>("admin", {}).then(setData).catch((err) => setError(errorText(err)));
  }, [loading, user, router]);

  const rows = useMemo(() => (data?.assinaturas ?? []).filter((r) => (app === "todos" || r.product === app) && (status === "todos" || r.status === status)), [data, app, status]);

  if (error) return <div className="admin"><h1 className="page-title">Administrador</h1><Notice kind="bad">{error}</Notice><Link className="btn ghost fit" href="/">Voltar</Link></div>;
  if (!data) return <Loading app="cobranca" />;

  const paying = data.assinaturas.filter((r) => r.status === "ativa" && r.provider !== "simulado");
  const mrr = paying.reduce((s, r) => s + monthly(r), 0);
  const byApp = (id: ProductId) => paying.filter((r) => r.product === id).length;
  const lost = data.assinaturas.filter((r) => r.status === "cancelada" || r.status === "reembolsada").length;

  return (
    <div className="admin">
      <header className="row between">
        <h1 className="page-title">Administrador</h1>
        <span className="muted">{user?.email}</span>
      </header>

      <section className="kpis" aria-label="Resumo">
        <div className="kpi color"><span>Entra por mês</span><b>{brl(mrr)}</b></div>
        <div className="kpi"><span>Assinantes ativos</span><b>{paying.length}</b></div>
        <div className="kpi"><span>Cobrança e Sobra</span><b>{byApp("cobranca")} e {byApp("sobra")}</b></div>
        <div className="kpi"><span>Cancelaram ou pediram reembolso</span><b>{lost}</b></div>
      </section>
      <p className="muted">{data.contas} {data.contas === 1 ? "conta criada" : "contas criadas"}. O valor por mês conta o plano anual dividido por 12.</p>

      <div className="filters">
        <select value={app} onChange={(e) => setApp(e.target.value)} aria-label="Filtrar por app">
          <option value="todos">Todos os apps</option>
          <option value="cobranca">Cobrança</option>
          <option value="sobra">Sobra</option>
        </select>
        <select value={status} onChange={(e) => setStatus(e.target.value)} aria-label="Filtrar por situação">
          <option value="todos">Todas as situações</option>
          {Object.entries(STATUS).map(([k, v]) => <option value={k} key={k}>{v.label}</option>)}
        </select>
      </div>

      {rows.length === 0 ? <div className="card empty"><h2>Nenhuma assinatura aqui</h2><p className="muted">Quando alguém assinar, aparece nesta lista.</p></div> : (
        <div className="table-wrap">
          <table className="table">
            <thead><tr><th>E-mail</th><th>App</th><th>Situação</th><th>Plano</th><th>Assinou em</th><th>Acesso até</th></tr></thead>
            <tbody>
              {rows.map((r) => (
                <tr key={r.email + r.product}>
                  <td>{r.email}</td>
                  <td>{PRODUCTS[r.product].name}</td>
                  <td><span className={`pill ${STATUS[r.status].kind}`}>{STATUS[r.status].label}</span></td>
                  <td>{brl(r.price_cents)} por {r.cycle === "anual" ? "ano" : "mês"}</td>
                  <td>{day(r.paid_at ?? r.created_at)}</td>
                  <td>{r.status === "pendente" || r.status === "reembolsada" ? "" : day(r.access_until)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
