"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { errorText } from "@/lib/supabase";
import { addDays, centsToInput, parseBRL, today } from "@/lib/format";
import { formatPhone, normalizePhone } from "@/lib/whatsapp";
import { priceProduct, type Order } from "@/lib/sobra-core";
import { saveOrder } from "@/lib/sobra-data";
import { ErrorBox } from "@/components/ui";
import { useSob } from "./SobData";
import { orderHref } from "./shell";

interface OrderRow { key: string; productId: string; name: string; qty: string; price: string }

const money = (c: number) => (c / 100).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
let seq = 0;
const newKey = () => `o${Date.now()}${seq++}`;
const emptyRow = (): OrderRow => ({ key: newKey(), productId: "", name: "", qty: "1", price: "" });

export function OrderForm({ order }: { order?: Order }) {
  const router = useRouter();
  const { products, ingMap, profile } = useSob();
  const options = products.map((p) => {
    const pr = priceProduct(p, ingMap, profile!);
    return { id: p.id, name: p.name, price: centsToInput(p.salePriceCents ?? pr.suggested) };
  });
  const [rows, setRows] = useState<OrderRow[]>(order?.items.length
    ? order.items.map((i) => ({ key: newKey(), productId: i.productId ?? "", name: i.name, qty: String(i.qty), price: centsToInput(i.unitPriceCents) }))
    : [emptyRow()]);
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  const total = rows.reduce((s, r) => s + (Number(r.qty) || 0) * (parseBRL(r.price) ?? 0), 0);

  function pick(key: string, productId: string) {
    const p = options.find((x) => x.id === productId);
    setRows((rs) => rs.map((r) => (r.key === key ? { ...r, productId, name: p?.name ?? r.name, price: p?.price ?? r.price } : r)));
  }
  const set = (key: string, patch: Partial<OrderRow>) => setRows((rs) => rs.map((r) => (r.key === key ? { ...r, ...patch } : r)));

  async function submit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const f = new FormData(e.currentTarget);
    const name = String(f.get("customer_name") ?? "").trim();
    const phoneRaw = String(f.get("phone") ?? "").trim();
    const phone = phoneRaw ? normalizePhone(phoneRaw) : null;
    const date = String(f.get("delivery_date") ?? "");
    const items = rows.filter((r) => r.name.trim()).map((r) => ({
      productId: r.productId || null, name: r.name.trim(), qty: Math.max(1, Math.round(Number(r.qty) || 0)), unitPriceCents: parseBRL(r.price) ?? 0,
    }));
    if (name.length < 2) return setError("Digite o nome de quem encomendou.");
    if (phoneRaw && !phone) return setError("Confira o WhatsApp (DDD e número).");
    if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) return setError("Escolha a data de entrega.");
    if (!items.length) return setError("Coloque pelo menos um item na encomenda.");
    setPending(true);
    setError(null);
    try {
      const id = await saveOrder({
        customerName: name, phone, deliveryDate: date, deliveryTime: String(f.get("delivery_time") || "") || null,
        depositCents: parseBRL(String(f.get("deposit") ?? "")) ?? 0, notes: String(f.get("notes") ?? "").trim() || null, items,
      }, order);
      router.push(`${orderHref(id)}&salvo=1`);
    } catch (err) {
      setError(errorText(err));
      setPending(false);
    }
  }

  return (
    <form onSubmit={submit} className="stack" style={{ gap: 16 }}>
      <label className="field"><span>Quem encomendou</span><input name="customer_name" required defaultValue={order?.customerName} autoComplete="off" /></label>
      <label className="field"><span>WhatsApp (opcional)</span><input name="phone" type="tel" inputMode="tel" defaultValue={order?.phone ? formatPhone(order.phone) : ""} placeholder="(11) 98765-4321" /></label>
      <div className="grid2">
        <label className="field"><span>Data da entrega</span><input name="delivery_date" type="date" required defaultValue={order?.deliveryDate ?? addDays(today(), 2)} /></label>
        <label className="field"><span>Hora (opcional)</span><input name="delivery_time" type="time" defaultValue={order?.deliveryTime ?? ""} /></label>
      </div>

      <section className="stack" style={{ gap: 10 }}>
        <h2 style={{ fontSize: 18 }}>O que vai na encomenda</h2>
        {rows.map((r) => (
          <fieldset className="card" key={r.key} style={{ margin: 0, gap: 10 }}>
            <label className="field"><span>Produto</span>
              <select value={r.productId} onChange={(e) => pick(r.key, e.target.value)}>
                <option value="">Outro (digitar)</option>
                {options.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
              </select>
            </label>
            {!r.productId && <label className="field"><span>Nome do item</span><input value={r.name} onChange={(e) => set(r.key, { name: e.target.value })} placeholder="Ex.: Bolo de aniversário 2 kg" /></label>}
            <div className="grid2">
              <label className="field"><span>Quantidade</span><input type="number" inputMode="numeric" min={1} value={r.qty} onChange={(e) => set(r.key, { qty: e.target.value })} /></label>
              <label className="field"><span>Preço de cada</span><input inputMode="decimal" value={r.price} onChange={(e) => set(r.key, { price: e.target.value })} placeholder="R$" /></label>
            </div>
            {rows.length > 1 && <button type="button" className="link-btn" style={{ alignSelf: "flex-start" }} onClick={() => setRows((rs) => rs.filter((x) => x.key !== r.key))}>Tirar item</button>}
          </fieldset>
        ))}
        <button type="button" className="btn ghost" onClick={() => setRows((rs) => [...rs, emptyRow()])}>+ Item</button>
      </section>

      <div className="card" style={{ gap: 4 }}>
        <span className="label">Total da encomenda</span>
        <span className="big md">{money(total)}</span>
      </div>
      <label className="field"><span>Sinal já pago</span><input name="deposit" inputMode="decimal" defaultValue={order?.depositCents ? centsToInput(order.depositCents) : ""} placeholder="0,00" /></label>
      <label className="field"><span>Observação (opcional)</span><input name="notes" defaultValue={order?.notes ?? ""} placeholder="Ex.: tema princesa, sem lactose" /></label>

      <ErrorBox error={error} />
      <button className="btn" disabled={pending}>{pending ? "Salvando…" : "Salvar encomenda"}</button>
    </form>
  );
}
