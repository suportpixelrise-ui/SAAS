"use client";

import Link from "next/link";
import { useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { ATT_LABEL, chargeTitle, currentPackage, historyOf, lastSentAt, METHOD_LABEL, openOf, TYPE_LABEL, type AttendanceKind } from "@/lib/cobranca-core";
import { addAttendance, deleteClient, markUnpaid, renewPackage, setPaused, undoLastAttendance } from "@/lib/cobranca-data";
import { errorText } from "@/lib/supabase";
import { brl, dueText, fullDate, shortDate, today } from "@/lib/format";
import { formatPhone } from "@/lib/whatsapp";
import { ErrorBox, Icon, Notice } from "@/components/ui";
import { useCob } from "../CobData";
import { clientHref, CobShell, NotFound, withSuspense } from "../shell";

function Ficha() {
  const router = useRouter();
  const qs = useSearchParams();
  const id = qs.get("id") ?? "";
  const { clients, charges, attendance, w } = useCob();
  const [flash, setFlash] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const c = clients.find((x) => x.id === id);
  if (!c) return <NotFound />;

  const open = openOf(charges, id);
  const openTotal = open.reduce((s, x) => s + x.amountCents, 0);
  const history = historyOf(charges, id);
  const pkg = c.billingType === "pacote" ? currentPackage(charges, id) : null;
  const pkgDone = pkg ? pkg.packageUsed >= (pkg.packageTotal ?? 0) : false;
  const att = attendance.filter((a) => a.clientId === id).sort((a, b) => b.date.localeCompare(a.date) || b.createdAt.localeCompare(a.createdAt)).slice(0, 8);
  const sent = lastSentAt(charges, id);
  const ref = today();
  const late = open.some((x) => x.dueDate < ref);

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

  async function mark(kind: AttendanceKind) {
    await act(async () => {
      const res = await addAttendance(c!, charges, kind);
      if (res && !res.ok) throw new Error("O pacote acabou. Renove para continuar marcando sessões.");
    }, `${ATT_LABEL[kind]} anotada em ${shortDate(ref)}.`);
  }

  return (
    <CobShell back={{ href: "/cobranca/clientes/", label: w.Many }}>
      {qs.get("novo") && !flash && <Notice kind="ok">Cadastro salvo.</Notice>}
      {qs.get("salvo") && !flash && <Notice kind="ok">Alterações salvas.</Notice>}
      {qs.get("pago") && !flash && <Notice kind="ok">Pagamento registrado.</Notice>}
      {qs.get("enviado") && !flash && <Notice kind="ok">Cobrança anotada como enviada hoje.</Notice>}
      {flash && <Notice kind="ok">{flash}</Notice>}
      <ErrorBox error={error} />

      <div className="stack" style={{ gap: 4 }}>
        <h1 className="page-title">{c.name}</h1>
        <span className="muted">{formatPhone(c.phone)} · {TYPE_LABEL[c.billingType]} de <span className="num">{brl(c.amountCents)}</span>{c.billingType === "mensal" && c.dueDay ? `, todo dia ${c.dueDay}` : ""}</span>
        {c.notes && <span className="muted small">{c.notes}</span>}
      </div>

      {c.paused && <Notice kind="warn">Cobrança pausada. Nenhuma mensalidade nova é gerada enquanto estiver assim.</Notice>}

      <section className="card">
        {open.length ? (
          <>
            <span className="label">{late ? "Em atraso" : "Em aberto"}</span>
            <span className={`big md ${late ? "t-bad" : ""}`}>{brl(openTotal)}</span>
            <span className="muted">{open.length === 1 ? chargeTitle(open[0]) : `${open.length} cobranças`} · {dueText(open[0].dueDate, ref)}{sent ? ` · último lembrete em ${shortDate(sent)}` : ""}</span>
            <div className="actions">
              <Link className="btn" href={clientHref(id, "cobrar")}><Icon name="whatsapp" size={20} /> Cobrar no WhatsApp</Link>
              <Link className="btn ghost" href={clientHref(id, "pagar")}><Icon name="check" size={20} /> Marcar como pago</Link>
            </div>
          </>
        ) : (
          <>
            <span className="pill ok" style={{ alignSelf: "flex-start" }}>Em dia</span>
            <span className="muted">Nada em aberto agora.</span>
          </>
        )}
      </section>

      {pkg && (
        <section className="card">
          <div className="row between"><h2>Pacote atual</h2><span className="num muted">{pkg.packageUsed} de {pkg.packageTotal} usadas</span></div>
          <div className="bar"><i style={{ width: `${Math.min(100, (pkg.packageUsed / (pkg.packageTotal || 1)) * 100)}%` }} /></div>
          {pkgDone && <button className="btn" disabled={busy} onClick={() => act(async () => { await renewPackage(c); router.push(clientHref(id, "cobrar")); })}>Renovar pacote e cobrar {brl(c.amountCents)}</button>}
        </section>
      )}

      <section className="card">
        <h2>{c.billingType === "mensal" ? "Presença e faltas" : "Marcar sessão de hoje"}</h2>
        <p className="muted small">
          {c.billingType === "pacote" ? "Sessão e falta sem aviso descontam do pacote. Falta avisada não desconta." :
           c.billingType === "sessao" ? "Sessão e falta sem aviso viram cobrança. Falta avisada não é cobrada." :
           "Só para o seu controle: não muda o valor da mensalidade."}
        </p>
        <div className="grid2" style={{ gridTemplateColumns: "repeat(3, 1fr)" }}>
          {(["presenca", "falta_avisada", "falta"] as const).map((k) => (
            <button key={k} className={`btn sm ${k === "presenca" ? "" : "ghost"}`} style={{ width: "100%", height: 48 }} disabled={busy || (k !== "falta_avisada" && pkgDone)} onClick={() => mark(k)}>
              {k === "presenca" ? "+ Sessão" : ATT_LABEL[k]}
            </button>
          ))}
        </div>
        {att.length > 0 && (
          <>
            <div className="list">
              {att.map((a) => (
                <div className="item" key={a.id} style={{ minHeight: 40 }}>
                  <span className="grow">{ATT_LABEL[a.kind]}</span>
                  <span className="muted num">{shortDate(a.date)}</span>
                </div>
              ))}
            </div>
            <button className="link-btn" disabled={busy} onClick={() => act(() => undoLastAttendance(c, charges, attendance), "Último registro desfeito.")}>Desfazer o último registro</button>
          </>
        )}
      </section>

      {history.length > 0 && (
        <section className="card">
          <h2>Histórico</h2>
          <div className="list">
            {history.map((h) => (
              <div className="item" key={h.id}>
                <div className="grow">
                  <div className="t" style={{ fontWeight: 500 }}>{chargeTitle(h)}</div>
                  <div className="s">{h.status === "paga" ? `Pago em ${fullDate(h.paidAt!)} · ${METHOD_LABEL[h.paidMethod ?? "pix"] ?? "Pix"}` : `Vence em ${fullDate(h.dueDate)}`}</div>
                </div>
                <div className="stack" style={{ gap: 2, alignItems: "flex-end" }}>
                  <b className="num">{brl(h.amountCents)}</b>
                  {h.status === "paga" ? (
                    <button className="link-btn" style={{ minHeight: 28, padding: 0, fontSize: 13 }} disabled={busy} onClick={() => act(() => markUnpaid(h.id), "Pagamento desfeito.")}>Desfazer</button>
                  ) : (
                    <span className={`pill ${h.dueDate < ref ? "bad" : "warn"}`}>{h.dueDate < ref ? "Atrasado" : "Aberto"}</span>
                  )}
                </div>
              </div>
            ))}
          </div>
        </section>
      )}

      <section className="actions">
        <Link className="btn ghost" href={clientHref(id, "editar")}>Editar cadastro</Link>
        <button className="btn ghost" disabled={busy} onClick={() => act(() => setPaused(c, !c.paused), c.paused ? "Cobrança retomada." : "Cobrança pausada.")}>
          <Icon name="pause" size={18} /> {c.paused ? "Retomar cobrança" : "Pausar cobrança"}
        </button>
        <details>
          <summary className="link-btn" style={{ color: "var(--bad)", listStyle: "none", textAlign: "center" }}>Remover cadastro</summary>
          <div className="stack" style={{ marginTop: 8 }}>
            <p className="muted small">Isso apaga {c.name} e todo o histórico de cobranças. Não dá para desfazer.</p>
            <button className="btn danger" disabled={busy} onClick={() => act(async () => { await deleteClient(id); router.replace("/cobranca/clientes/?removido=1"); })}>Sim, remover</button>
          </div>
        </details>
      </section>
    </CobShell>
  );
}

export default withSuspense(Ficha);
