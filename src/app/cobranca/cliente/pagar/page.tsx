"use client";

import { useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { chargeTitle, openOf } from "@/lib/cobranca-core";
import { markPaid } from "@/lib/cobranca-data";
import { errorText } from "@/lib/supabase";
import { brl, fullDate, today } from "@/lib/format";
import { Empty, ErrorBox } from "@/components/ui";
import { useCob } from "../../CobData";
import { clientHref, CobShell, NotFound, withSuspense } from "../../shell";

function Pagar() {
  const router = useRouter();
  const id = useSearchParams().get("id") ?? "";
  const { clients, charges } = useCob();
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  const c = clients.find((x) => x.id === id);
  if (!c) return <NotFound />;
  const open = openOf(charges, id);

  async function submit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const f = new FormData(e.currentTarget);
    const ids = f.getAll("charge").map(String);
    if (!ids.length) return setError("Marque o que foi pago.");
    const method = String(f.get("method") || "pix");
    const date = /^\d{4}-\d{2}-\d{2}$/.test(String(f.get("date"))) ? String(f.get("date")) : today();
    setPending(true);
    try {
      await markPaid(ids, method, date);
      router.replace(`${clientHref(id)}&pago=1`);
    } catch (err) {
      setError(errorText(err));
      setPending(false);
    }
  }

  return (
    <CobShell back={{ href: clientHref(id), label: c.name }} title="Marcar como pago">
      {open.length === 0 ? <Empty icon="check" title="Nada em aberto" text={`${c.name} está em dia.`} /> : (
        <form onSubmit={submit} className="stack" style={{ gap: 16 }}>
          <fieldset className="card" style={{ margin: 0 }}>
            <legend className="label" style={{ padding: 0, marginBottom: 4 }}>O que foi pago</legend>
            {open.map((ch) => (
              <label className="item" key={ch.id} style={{ cursor: "pointer" }}>
                <input type="checkbox" name="charge" value={ch.id} defaultChecked style={{ width: 22, height: 22, accentColor: "var(--accent)" }} />
                <span className="grow">
                  <span className="t" style={{ display: "block", fontWeight: 500 }}>{chargeTitle(ch)}</span>
                  <span className="s">vence em {fullDate(ch.dueDate)}</span>
                </span>
                <b className="num">{brl(ch.amountCents)}</b>
              </label>
            ))}
          </fieldset>
          <fieldset className="stack" style={{ border: 0, padding: 0, margin: 0, gap: 8 }}>
            <legend className="field" style={{ marginBottom: 8 }}><span>Como pagou</span></legend>
            <div className="choices three">
              <label className="choice"><input type="radio" name="method" value="pix" defaultChecked /><span>Pix</span></label>
              <label className="choice"><input type="radio" name="method" value="dinheiro" /><span>Dinheiro</span></label>
              <label className="choice"><input type="radio" name="method" value="cartao" /><span>Cartão</span></label>
            </div>
          </fieldset>
          <label className="field"><span>Data do pagamento</span><input type="date" name="date" defaultValue={today()} max={today()} /></label>
          <ErrorBox error={error} />
          <button className="btn" disabled={pending}>{pending ? "Salvando…" : "Confirmar pagamento"}</button>
        </form>
      )}
    </CobShell>
  );
}

export default withSuspense(Pagar);
