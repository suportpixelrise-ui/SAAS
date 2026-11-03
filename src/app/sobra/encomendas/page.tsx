"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { brl, diffDays, fullDate, monthLabel, shortDate, today } from "@/lib/format";
import { deliveredOrders, orderRest, upcomingOrders, type Order } from "@/lib/sobra-core";
import { setOrderStatus } from "@/lib/sobra-data";
import { Empty, Icon, Notice } from "@/components/ui";
import { useSob } from "../SobData";
import { orderHref, SobShell, withSuspense } from "../shell";

const WEEKDAY = ["domingo", "segunda", "terça", "quarta", "quinta", "sexta", "sábado"];

function dayLabel(date: string, ref: string) {
  const d = diffDays(date, ref);
  if (d < 0) return `Atrasada · ${fullDate(date)}`;
  if (d === 0) return "Hoje";
  if (d === 1) return "Amanhã";
  const wd = WEEKDAY[new Date(`${date}T12:00:00Z`).getUTCDay()];
  return `${wd.charAt(0).toUpperCase() + wd.slice(1)}, ${shortDate(date)}`;
}

function OrderCard({ o, refDate }: { o: Order; refDate: string }) {
  const rest = orderRest(o);
  return (
    <div className="item" style={{ alignItems: "flex-start" }}>
      <Link href={orderHref(o.id)} className="grow" style={{ textDecoration: "none", color: "inherit" }}>
        <div className="t">{o.customerName}{o.deliveryTime ? ` · ${o.deliveryTime}` : ""}</div>
        <div className="s">{o.items.map((i) => `${i.name} ×${i.qty}`).join(", ")}</div>
        <div className="s num">Total {brl(o.totalCents)}{rest > 0 ? ` · falta ${brl(rest)}` : ""}</div>
      </Link>
      <div className="stack" style={{ gap: 6, alignItems: "flex-end" }}>
        <span className={`pill ${o.status === "paga" || rest <= 0 ? "ok" : o.depositCents > 0 ? "warn" : ""}`}>{o.status === "paga" || rest <= 0 ? "Pago" : o.depositCents > 0 ? "Sinal pago" : "Sem sinal"}</span>
        {o.status !== "entregue" && o.deliveryDate <= refDate && <button className="btn ghost sm" onClick={() => setOrderStatus(o, "entregue")}>Entregue</button>}
      </div>
    </div>
  );
}

function Encomendas() {
  const qs = useSearchParams();
  const ver = qs.get("ver");
  const { orders } = useSob();
  const ref = today();
  const list = ver === "entregues" ? deliveredOrders(orders) : upcomingOrders(orders, 60, ref);
  const groups = new Map<string, Order[]>();
  for (const o of list) {
    const k = ver === "entregues" ? o.deliveryDate.slice(0, 7) : o.deliveryDate < ref ? "atrasadas" : o.deliveryDate;
    groups.set(k, [...(groups.get(k) ?? []), o]);
  }

  return (
    <SobShell active="encomendas" title="Encomendas">
      {qs.get("removida") && <Notice kind="ok">Encomenda apagada.</Notice>}
      <nav className="pills" aria-label="Filtro">
        <Link className={`pill ${ver !== "entregues" ? "accent" : ""}`} href="/sobra/encomendas/" style={{ textDecoration: "none" }}>A entregar</Link>
        <Link className={`pill ${ver === "entregues" ? "accent" : ""}`} href="/sobra/encomendas/?ver=entregues" style={{ textDecoration: "none" }}>Entregues</Link>
      </nav>
      {list.length === 0 ? (
        <Empty icon="calendar" title={ver === "entregues" ? "Nada entregue ainda" : "Nenhuma encomenda marcada"} text="Anote cada pedido com a data de entrega e o sinal. O app mostra o que sai em cada dia." action={<Link className="btn" href="/sobra/encomendas/nova/">Nova encomenda</Link>} />
      ) : (
        [...groups.entries()].map(([k, items]) => (
          <section className="card" key={k} style={{ paddingTop: 12, paddingBottom: 8 }}>
            <h2 className={k === "atrasadas" ? "t-bad" : ""}>{k === "atrasadas" ? "Atrasadas" : ver === "entregues" ? monthLabel(k) : dayLabel(k, ref)}</h2>
            <div className="list">{items.map((o) => <OrderCard o={o} refDate={ref} key={o.id} />)}</div>
          </section>
        ))
      )}
      {list.length > 0 && <Link className="btn dark fab" href="/sobra/encomendas/nova/"><Icon name="plus" size={20} /> Encomenda</Link>}
    </SobShell>
  );
}

export default withSuspense(Encomendas);
