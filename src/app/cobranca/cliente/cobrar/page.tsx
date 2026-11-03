"use client";

import Link from "next/link";
import { useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { buildMessage, openOf, STAGE_LABEL, stageFor, type Stage } from "@/lib/cobranca-core";
import { markSent } from "@/lib/cobranca-data";
import { errorText } from "@/lib/supabase";
import { brl } from "@/lib/format";
import { Empty, ErrorBox } from "@/components/ui";
import { useCob } from "../../CobData";
import { clientHref, CobShell, NotFound, withSuspense } from "../../shell";

const STAGES: Stage[] = ["antes", "dia", "depois"];

function Cobrar() {
  const qs = useSearchParams();
  const id = qs.get("id") ?? "";
  const fromQueue = qs.get("volta") === "lembretes";
  const { profile, templates, clients, charges } = useCob();
  const c = clients.find((x) => x.id === id);
  if (!c) return <NotFound />;
  const open = openOf(charges, id);
  const back = fromQueue ? { href: "/cobranca/lembretes/", label: "Lembretes" } : { href: clientHref(id), label: c.name };

  if (!open.length) {
    return (
      <CobShell back={back}>
        <Empty icon="check" title="Nada para cobrar" text={`${c.name} não tem nada em aberto agora.`} action={<Link className="btn ghost" href={clientHref(id)}>Ver ficha</Link>} />
      </CobShell>
    );
  }

  const suggested = stageFor(open[0].dueDate);
  const etapa = qs.get("etapa") as Stage | null;
  const stage: Stage = etapa && STAGES.includes(etapa) ? etapa : suggested;
  const msg = buildMessage(profile!, templates[stage], c, open);
  const q = (s: Stage) => `${clientHref(id, "cobrar")}&etapa=${s}${fromQueue ? "&volta=lembretes" : ""}`;

  return (
    <CobShell back={back}>
      <div className="stack" style={{ gap: 4 }}>
        <h1 className="page-title">Confira a mensagem</h1>
        <span className="muted">Para {c.name} · <b className="num">{brl(msg.total)}</b></span>
      </div>
      <nav className="choices three" aria-label="Modelo de mensagem">
        {STAGES.map((s) => (
          <Link key={s} href={q(s)} replace className="choice" aria-current={s === stage ? "true" : undefined} style={{ textDecoration: "none", color: "inherit" }}>
            <span style={s === stage ? { borderColor: "var(--accent)", boxShadow: "inset 0 0 0 1px var(--accent)", background: "var(--accent-soft)" } : undefined}>
              {s === "antes" ? "Antes" : s === "dia" ? "No dia" : "Depois"}
            </span>
          </Link>
        ))}
      </nav>
      <span className="muted small">{STAGE_LABEL[stage]}{stage === suggested ? " (sugerido)" : ""} · <Link href="/cobranca/lembretes/mensagens/">editar modelos</Link></span>
      <Sender key={stage} clientId={id} phone={c.phone} initialText={msg.text} pix={msg.pix} stage={stage} fromQueue={fromQueue} />
    </CobShell>
  );
}

/** Abre a conversa no WhatsApp (link oficial wa.me) com o texto pronto; quando volta, pergunta se enviou. */
function Sender({ clientId, phone, initialText, pix, stage, fromQueue }: { clientId: string; phone: string; initialText: string; pix: string; stage: Stage; fromQueue: boolean }) {
  const router = useRouter();
  const { charges } = useCob();
  const [text, setText] = useState(initialText);
  const [opened, setOpened] = useState(false);
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  const href = `https://wa.me/${phone}?text=${encodeURIComponent(text)}`;

  async function copyPix() {
    try {
      await navigator.clipboard.writeText(pix);
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    } catch {
      setCopied(false);
    }
  }

  async function confirmSent() {
    setPending(true);
    try {
      await markSent(openOf(charges, clientId), stage);
      router.replace(fromQueue ? "/cobranca/lembretes/?enviado=1" : `${clientHref(clientId)}&enviado=1`);
    } catch (err) {
      setError(errorText(err));
      setPending(false);
    }
  }

  return (
    <div className="stack" style={{ gap: 14 }}>
      <label className="field">
        <span>Mensagem</span>
        <div className="bubble"><textarea value={text} onChange={(e) => setText(e.target.value)} aria-describedby="dica-msg" /></div>
        <small id="dica-msg">Toque no texto para mudar o que quiser. O valor e o Pix já estão nele.</small>
      </label>
      <ErrorBox error={error} />
      {!opened ? (
        <div className="actions">
          <a className="btn" href={href} target="_blank" rel="noopener noreferrer" onClick={() => setOpened(true)}>Abrir no WhatsApp</a>
          <button type="button" className="btn ghost" onClick={copyPix}>{copied ? "Pix copiado!" : "Copiar só o Pix"}</button>
        </div>
      ) : (
        <div className="card" style={{ gap: 10 }}>
          <h2>Conseguiu enviar?</h2>
          <button className="btn" disabled={pending} onClick={confirmSent}>{pending ? "Anotando…" : "Sim, enviei"}</button>
          <a className="btn ghost" href={href} target="_blank" rel="noopener noreferrer">Abrir de novo</a>
          <button type="button" className="link-btn" onClick={() => setOpened(false)}>Não enviei</button>
        </div>
      )}
    </div>
  );
}

export default withSuspense(Cobrar);
