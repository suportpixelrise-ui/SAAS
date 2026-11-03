"use client";

import Link from "next/link";
import { useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { errorText } from "@/lib/supabase";
import { brl, fullDate } from "@/lib/format";
import { orderRest } from "@/lib/sobra-core";
import { deleteOrder, setOrderStatus } from "@/lib/sobra-data";
import { ErrorBox, Icon, Notice } from "@/components/ui";
import { useSob } from "../SobData";
import { NotFound, orderHref, SobShell, withSuspense } from "../shell";
import { OrderForm } from "../OrderForm";

function Encomenda() {
  const router = useRouter();
  const qs = useSearchParams();
  const id = qs.get("id") ?? "";
  const { orders } = useSob();
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const o = orders.find((x) => x.id === id);
  if (!o) return <NotFound what="Encomenda" back="/sobra/encomendas/" />;
  const rest = orderRest(o);

  if (qs.get("editar")) {
    return (
      <SobShell back={{ href: orderHref(id), label: o.customerName }} title="Editar encomenda">
        <OrderForm order={o} />
      </SobShell>
    );
  }

  async function act(fn: () => Promise<unknown>) {
    setBusy(true);
    setError(null);
    try {
      await fn();
    } catch (err) {
      setError(errorText(err));
    } finally {
      setBusy(false);
    }
  }

  return (
    <SobShell back={{ href: "/sobra/encomendas/", label: "Encomendas" }}>
      {qs.get("salvo") && <Notice kind="ok">Encomenda salva.</Notice>}
      <ErrorBox error={error} />
      <div className="stack" style={{ gap: 4 }}>
        <h1 className="page-title">{o.customerName}</h1>
        <span className="muted">Entrega em {fullDate(o.deliveryDate)}{o.deliveryTime ? ` às ${o.deliveryTime}` : ""}</span>
        {o.notes && <span className="muted small">{o.notes}</span>}
      </div>

      <section className="card">
        <div className="list">
          {o.items.map((i, k) => (
            <div className="item" key={k} style={{ minHeight: 44 }}>
              <span className="grow">{i.name} <span className="muted">×{i.qty}</span></span>
              <b className="num">{brl(i.qty * i.unitPriceCents)}</b>
            </div>
          ))}
        </div>
        <div className="kv"><span>Total</span><b>{brl(o.totalCents)}</b></div>
        <div className="kv"><span>Sinal pago</span><b>{brl(o.depositCents)}</b></div>
        <div className="kv"><span>Falta receber</span><b className={rest > 0 ? "t-warn" : "t-ok"}>{brl(rest)}</b></div>
      </section>

      <div className="actions">
        {rest > 0 && <button className="btn" disabled={busy} onClick={() => act(() => setOrderStatus(o, "paga"))}><Icon name="check" size={20} /> Recebi o restante</button>}
        {o.status !== "entregue"
          ? <button className={`btn ${rest > 0 ? "ghost" : ""}`} disabled={busy} onClick={() => act(() => setOrderStatus(o, "entregue"))}>Marcar como entregue</button>
          : <Notice kind="ok">Entregue.</Notice>}
        {o.phone && <a className="btn ghost" href={`https://wa.me/${o.phone}`} target="_blank" rel="noopener noreferrer"><Icon name="whatsapp" size={20} /> Conversar no WhatsApp</a>}
        <Link className="btn ghost" href={`${orderHref(id)}&editar=1`}>Editar encomenda</Link>
        <details>
          <summary className="link-btn" style={{ color: "var(--bad)", listStyle: "none", textAlign: "center" }}>Apagar encomenda</summary>
          <button className="btn danger" style={{ marginTop: 8 }} disabled={busy} onClick={() => act(async () => { await deleteOrder(id); router.replace("/sobra/encomendas/?removida=1"); })}>Sim, apagar</button>
        </details>
      </div>
    </SobShell>
  );
}

export default withSuspense(Encomenda);
