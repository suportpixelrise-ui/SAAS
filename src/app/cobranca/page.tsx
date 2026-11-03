"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { monthSummary, toChargeSoon } from "@/lib/cobranca-core";
import { addMonths, brl, currentMonth, dueText, initials, monthLabel, today } from "@/lib/format";
import { Empty, Icon, Notice } from "@/components/ui";
import { useCob } from "./CobData";
import { clientHref, CobShell, withSuspense } from "./shell";

function Inicio() {
  const qs = useSearchParams();
  const { profile, clients, charges, w } = useCob();
  const mes = qs.get("mes");
  const ym = mes && /^\d{4}-\d{2}$/.test(mes) ? mes : currentMonth();
  const isCurrent = ym === currentMonth();
  const ref = today();
  const s = monthSummary(charges, ym, ref);
  const soon = isCurrent ? toChargeSoon(clients, charges, ref) : [];
  const pct = s.total ? Math.round((s.paid / s.total) * 100) : 0;

  return (
    <CobShell active="inicio">
      {qs.get("assinou") && <Notice kind="ok">Assinatura ativa. Obrigado por assinar!</Notice>}
      <div className="row between">
        <span className="muted">Olá, {profile!.displayName.split(" ")[0]}</span>
        <div className="row" style={{ gap: 4 }}>
          <Link className="btn ghost sm" href={`/cobranca/?mes=${addMonths(ym, -1)}`} aria-label="Mês anterior"><Icon name="chevron-left" size={18} /></Link>
          <b style={{ fontFamily: "var(--font-display)", minWidth: 96, textAlign: "center" }}>{monthLabel(ym)}</b>
          <Link className="btn ghost sm" href={`/cobranca/?mes=${addMonths(ym, 1)}`} aria-label="Próximo mês"><Icon name="chevron-right" size={18} /></Link>
        </div>
      </div>

      {clients.length === 0 ? (
        <Empty icon="users" title={`Cadastre seu primeiro ${w.one}`} text="Nome, WhatsApp, valor e vencimento. Leva um minuto e você já pode mandar a primeira cobrança." action={<Link className="btn" href="/cobranca/clientes/novo/">Cadastrar {w.one}</Link>} />
      ) : (
        <>
          <section className="hero" aria-label="Resumo do mês">
            <span className="label">Falta receber</span>
            <span className="big">{brl(s.open)}</span>
            <span className="muted">Entrou {brl(s.paid)} de {brl(s.total)}</span>
            <div className="bar" role="img" aria-label={`${pct}% recebido`}><i style={{ width: `${pct}%` }} /></div>
          </section>

          <div className="pills">
            <span className="pill ok">{s.paidClients} {s.paidClients === 1 ? "pagou" : "pagaram"}</span>
            <span className="pill bad">{s.owingClients} {s.owingClients === 1 ? "deve" : "devem"}</span>
            {isCurrent && <span className="pill warn">{s.dueToday} {s.dueToday === 1 ? "vence" : "vencem"} hoje</span>}
          </div>

          {isCurrent && (
            <section className="card">
              <h2>Cobrar agora</h2>
              {soon.length === 0 ? <p className="muted">Ninguém para cobrar hoje. Tudo em dia.</p> : (
                <div className="list">
                  {soon.map((d) => (
                    <div className="item" key={d.client.id}>
                      <span className="avatar" aria-hidden="true">{initials(d.client.name)}</span>
                      <Link href={clientHref(d.client.id)} className="grow" style={{ textDecoration: "none", color: "inherit" }}>
                        <div className="t">{d.client.name}</div>
                        <div className={`s ${d.firstDue < ref ? "t-bad" : d.firstDue === ref ? "t-warn" : ""}`}>{dueText(d.firstDue, ref)} · <span className="num">{brl(d.total)}</span></div>
                      </Link>
                      <Link className="btn sm" href={clientHref(d.client.id, "cobrar")}>Cobrar</Link>
                    </div>
                  ))}
                </div>
              )}
            </section>
          )}
          <Link className="btn dark fab" href="/cobranca/clientes/novo/"><Icon name="plus" size={20} /> {w.one.charAt(0).toUpperCase() + w.one.slice(1)}</Link>
        </>
      )}
    </CobShell>
  );
}

export default withSuspense(Inicio);
