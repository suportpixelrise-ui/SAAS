"use client";

import Link from "next/link";
import { useState } from "react";
import { useSearchParams } from "next/navigation";
import { clientRows, TYPE_LABEL } from "@/lib/cobranca-core";
import { brl, dueText, initials, today } from "@/lib/format";
import { Empty, Icon, Notice } from "@/components/ui";
import { useCob } from "../CobData";
import { clientHref, CobShell, withSuspense } from "../shell";

function Clientes() {
  const qs = useSearchParams();
  const { clients, charges, w } = useCob();
  const [q, setQ] = useState("");
  const rows = clientRows(clients, charges, q);
  const ref = today();

  return (
    <CobShell active="clientes" title={w.Many}>
      {qs.get("removido") && <Notice kind="ok">Cadastro removido.</Notice>}
      {clients.length > 0 && (
        <label className="field">
          <span className="sr-only">Buscar</span>
          <input type="search" value={q} onChange={(e) => setQ(e.target.value)} placeholder={`Buscar ${w.one} pelo nome`} />
        </label>
      )}

      {rows.length === 0 ? (
        q ? <p className="muted">Ninguém com “{q}”.</p> : (
          <Empty icon="users" title={`Nenhum ${w.one} ainda`} text="Cadastre e mande a primeira cobrança em menos de um minuto." action={<Link className="btn" href="/cobranca/clientes/novo/">Cadastrar {w.one}</Link>} />
        )
      ) : (
        <section className="card" style={{ paddingTop: 8, paddingBottom: 8 }}>
          <div className="list">
            {rows.map((c) => {
              const late = c.nextDue && c.nextDue < ref;
              const status = c.paused ? <span className="pill">Pausado</span>
                : c.openCount === 0 ? <span className="pill ok">Em dia</span>
                : <span className={`pill ${late ? "bad" : "warn"}`}>{late ? "Deve" : "A vencer"}</span>;
              return (
                <Link className="item" href={clientHref(c.id)} key={c.id}>
                  <span className="avatar" aria-hidden="true">{initials(c.name)}</span>
                  <div className="grow">
                    <div className="t">{c.name}</div>
                    <div className="s">{TYPE_LABEL[c.billingType]} · <span className="num">{brl(c.amountCents)}</span>{c.openCount > 0 && c.nextDue && !c.paused ? ` · ${dueText(c.nextDue, ref)}` : ""}</div>
                  </div>
                  {status}
                </Link>
              );
            })}
          </div>
        </section>
      )}
      {clients.length > 0 && <Link className="btn dark fab" href="/cobranca/clientes/novo/"><Icon name="plus" size={20} /> Novo</Link>}
    </CobShell>
  );
}

export default withSuspense(Clientes);
