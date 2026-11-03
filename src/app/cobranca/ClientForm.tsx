"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { errorText } from "@/lib/supabase";
import { addMonths, centsToInput, currentMonth, monthName, today } from "@/lib/format";
import { formatPhone } from "@/lib/whatsapp";
import type { Client } from "@/lib/cobranca-core";
import { createClient, updateClient } from "@/lib/cobranca-data";
import { ErrorBox } from "@/components/ui";
import { useCob } from "./CobData";
import { parseClient } from "./forms";
import { clientHref } from "./shell";

/** Os campos de cada tipo aparecem conforme a escolha (CSS :has). */
export function ClientForm({ client }: { client?: Client }) {
  const router = useRouter();
  const { w, charges } = useCob();
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  const editing = Boolean(client);
  const type = client?.billingType ?? "mensal";

  async function submit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const submitter = (e.nativeEvent as SubmitEvent).submitter as HTMLButtonElement | null;
    const input = parseClient(new FormData(e.currentTarget));
    if (typeof input === "string") return setError(input);
    setPending(true);
    setError(null);
    try {
      if (client) {
        await updateClient(client, input, charges);
        router.push(`${clientHref(client.id)}&salvo=1`);
      } else {
        const id = await createClient(input);
        router.push(submitter?.value === "cobrar" && input.billingType !== "sessao" ? clientHref(id, "cobrar") : `${clientHref(id)}&novo=1`);
      }
    } catch (err) {
      setError(errorText(err));
      setPending(false);
    }
  }

  return (
    <form onSubmit={submit} className="stack client-form" style={{ gap: 16 }}>
      <label className="field"><span>Nome do {w.one}</span><input name="name" required defaultValue={client?.name} autoComplete="off" /></label>
      <label className="field"><span>WhatsApp</span><input name="phone" type="tel" inputMode="tel" required defaultValue={client ? formatPhone(client.phone) : ""} placeholder="(11) 98765-4321" /></label>

      <fieldset className="stack" style={{ border: 0, padding: 0, margin: 0, gap: 8 }}>
        <legend className="field" style={{ marginBottom: 8 }}><span>Como você cobra</span></legend>
        <div className="choices three">
          <label className="choice"><input type="radio" name="billing_type" value="mensal" defaultChecked={type === "mensal"} /><span>Mensalidade</span></label>
          <label className="choice"><input type="radio" name="billing_type" value="pacote" defaultChecked={type === "pacote"} /><span>Pacote</span></label>
          <label className="choice"><input type="radio" name="billing_type" value="sessao" defaultChecked={type === "sessao"} /><span>Por sessão</span></label>
        </div>
      </fieldset>

      <label className="field">
        <span className="if-mensal">Valor da mensalidade</span>
        <span className="if-pacote">Valor do pacote</span>
        <span className="if-sessao">Valor de cada sessão</span>
        <input name="amount" inputMode="decimal" required defaultValue={client ? centsToInput(client.amountCents) : ""} placeholder="180,00" />
      </label>

      <div className="if-mensal stack" style={{ gap: 12 }}>
        <label className="field"><span>Dia do vencimento</span>
          <select name="due_day" defaultValue={String(client?.dueDay ?? 10)}>
            {Array.from({ length: 31 }, (_, i) => i + 1).map((d) => <option key={d} value={d}>Todo dia {d}</option>)}
          </select>
        </label>
        {!editing && (
          <label className="field"><span>Primeira cobrança</span>
            <select name="start" defaultValue="atual">
              <option value="atual">Neste mês ({monthName(currentMonth())})</option>
              <option value="proximo">No próximo mês ({monthName(addMonths(currentMonth(), 1))})</option>
            </select>
          </label>
        )}
      </div>

      <div className="if-pacote stack" style={{ gap: 12 }}>
        <label className="field"><span>Quantas sessões tem o pacote</span><input name="package_sessions" type="number" inputMode="numeric" min={1} max={200} defaultValue={client?.packageSessions ?? 8} /></label>
        {!editing && <label className="field"><span>Vencimento do pagamento</span><input name="first_due" type="date" defaultValue={today()} /></label>}
      </div>

      <p className="if-sessao muted small">Cada sessão que você marcar na ficha vira uma cobrança. Falta avisada não é cobrada.</p>

      <label className="field"><span>Observação (opcional)</span><input name="notes" defaultValue={client?.notes ?? ""} placeholder="Ex.: treina terça e quinta" /></label>

      <ErrorBox error={error} />
      <div className="actions">
        {editing ? (
          <button className="btn" disabled={pending}>{pending ? "Salvando…" : "Salvar"}</button>
        ) : (
          <>
            <button className="btn if-not-sessao" name="depois" value="cobrar" disabled={pending}>{pending ? "Salvando…" : "Salvar e cobrar"}</button>
            <button className="btn ghost" name="depois" value="ficha" disabled={pending}>Só salvar</button>
          </>
        )}
      </div>
    </form>
  );
}
