"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { reminderQueue, STAGE_LABEL } from "@/lib/cobranca-core";
import { brl, dueText, initials, today } from "@/lib/format";
import { Empty, Notice } from "@/components/ui";
import { useCob } from "../CobData";
import { clientHref, CobShell, withSuspense } from "../shell";

function Lembretes() {
  const qs = useSearchParams();
  const { clients, charges } = useCob();
  const ref = today();
  const queue = reminderQueue(clients, charges, ref);

  return (
    <CobShell active="lembretes" title="Lembretes">
      {qs.get("enviado") && <Notice kind="ok">Anotado! {queue.length ? "Vamos para o próximo." : "Acabaram os lembretes de hoje."}</Notice>}
      {queue.length > 0 && <p className="lead">Hoje: {queue.length} {queue.length === 1 ? "lembrete para enviar" : "lembretes para enviar"}. Cada um abre o seu WhatsApp com a mensagem pronta.</p>}
      {queue.length === 0 ? (
        <Empty icon="bell" title="Nenhum lembrete para hoje" text="O app avisa 2 dias antes, no dia e depois do vencimento. Quando tiver alguém, aparece aqui." />
      ) : (
        <div className="stack">
          {queue.map((d, i) => (
            <section className="card" key={d.client.id} style={{ animationDelay: `${i * 60}ms` }}>
              <div className="row">
                <span className="avatar" aria-hidden="true">{initials(d.client.name)}</span>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontWeight: 600 }}>{d.client.name}</div>
                  <div className={`small ${d.firstDue < ref ? "t-bad" : d.firstDue === ref ? "t-warn" : "muted"}`}>{dueText(d.firstDue, ref)} · <span className="num">{brl(d.total)}</span></div>
                </div>
                <span className="pill accent">{STAGE_LABEL[d.stage].replace(" do vencimento", "")}</span>
              </div>
              <Link className="btn" href={`${clientHref(d.client.id, "cobrar")}&etapa=${d.stage}&volta=lembretes`}>Enviar lembrete</Link>
            </section>
          ))}
        </div>
      )}
      <Link className="btn ghost" href="/cobranca/lembretes/mensagens/">Editar mensagens</Link>
    </CobShell>
  );
}

export default withSuspense(Lembretes);
