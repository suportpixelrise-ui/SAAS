"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { errorText } from "@/lib/supabase";
import { centsToInput, parseBRL } from "@/lib/format";
import { BASE_UNIT, unitCost, type Unit } from "@/lib/sobra-calc";
import { profileHourCost, type Product } from "@/lib/sobra-core";
import { saveProduct } from "@/lib/sobra-data";
import { ErrorBox } from "@/components/ui";
import { useSob } from "./SobData";
import { productHref } from "./shell";

interface KnownIngredient { id: string; name: string; unit: Unit; package_qty: number; price: string }
export interface Row { key: string; ingredientId?: string; name: string; unit: Unit; packageQty: string; price: string; qty: string }
export interface ProductDefaults { id?: string; name: string; yield: string; packaging: string; gas: string; work: string; sale: string; rows: Row[] }

const UNIT_LABEL: Record<Unit, string> = { g: "g", kg: "kg", ml: "ml", l: "litro", un: "unidade" };
const toCents = (s: string) => {
  const n = Number(String(s).replace(/R\$|\s/g, "").replace(/\.(?=\d{3}(\D|$))/g, "").replace(",", "."));
  return Number.isFinite(n) ? Math.round(n * 100) : 0;
};
const toNum = (s: string) => Number(String(s).replace(",", ".")) || 0;
const money = (c: number) => (c / 100).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
let seq = 0;
const newKey = () => `r${Date.now()}${seq++}`;

export function ProductForm({ defaults, product }: { defaults: ProductDefaults; product?: Product }) {
  const router = useRouter();
  const { ingredients, profile } = useSob();
  const known: KnownIngredient[] = useMemo(() => ingredients.map((k) => ({ id: k.id, name: k.name, unit: k.unit, package_qty: k.packageQty, price: centsToInput(k.packagePriceCents) })), [ingredients]);
  const gasPerHourCents = profile!.gasCostPerHourCents;
  const hourCostCents = profileHourCost(profile!);
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  const [rows, setRows] = useState<Row[]>(defaults.rows.length ? defaults.rows : [{ key: newKey(), name: "", unit: "g", packageQty: "", price: "", qty: "" }]);
  const [yieldU, setYield] = useState(defaults.yield);
  const [packaging, setPackaging] = useState(defaults.packaging);
  const [gas, setGas] = useState(defaults.gas);
  const [work, setWork] = useState(defaults.work);

  const byName = useMemo(() => new Map(known.map((k) => [k.name.toLowerCase(), k])), [known]);

  function update(key: string, patch: Partial<Row>) {
    setRows((rs) => rs.map((r) => {
      if (r.key !== key) return r;
      const next = { ...r, ...patch };
      if (patch.name !== undefined) {
        const k = byName.get(patch.name.trim().toLowerCase());
        if (k) Object.assign(next, { ingredientId: k.id, unit: k.unit, packageQty: String(k.package_qty).replace(".", ","), price: k.price });
        else next.ingredientId = undefined;
      }
      return next;
    }));
  }

  const cost = unitCost({
    items: rows.filter((r) => toNum(r.packageQty) > 0).map((r) => ({ qty: toNum(r.qty), packagePriceCents: toCents(r.price), packageQty: toNum(r.packageQty), unit: r.unit })),
    yieldUnits: Math.max(1, Math.round(toNum(yieldU))),
    packagingCents: toCents(packaging),
    gasMinutes: toNum(gas),
    workMinutes: toNum(work),
    gasCostPerHourCents: gasPerHourCents,
    hourCostCents,
  });
  const missingPrice = rows.some((r) => r.name.trim() && !toCents(r.price));

  async function submit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const f = new FormData(e.currentTarget);
    const name = String(f.get("name") ?? "").trim();
    const y = Number(yieldU);
    const g = gas ? toNum(gas) : 0;
    const wk = work ? toNum(work) : 0;
    const saleRaw = String(f.get("sale") ?? "").trim();
    const sale = saleRaw ? parseBRL(saleRaw) : null;
    if (name.length < 2) return setError("Dê um nome ao produto.");
    if (!Number.isInteger(y) || y < 1) return setError("Diga quantas unidades a receita rende.");
    if (g < 0 || wk < 0) return setError("Confira os minutos de fogão e de trabalho.");
    if (saleRaw && sale == null) return setError("Confira o preço de venda (ex.: 2,50).");
    setPending(true);
    setError(null);
    try {
      const id = await saveProduct({
        name, yieldUnits: y, packagingCents: parseBRL(packaging) ?? 0, gasMinutes: Math.round(g), workMinutes: Math.round(wk), salePriceCents: sale,
      }, rows.map(({ key, ...r }) => r), ingredients, product);
      router.push(`${productHref(id)}&${product ? "salvo" : "novo"}=1`);
    } catch (err) {
      setError(errorText(err));
      setPending(false);
    }
  }

  return (
    <form onSubmit={submit} className="stack" style={{ gap: 16 }}>
      <datalist id="insumos-conhecidos">{known.map((k) => <option key={k.id} value={k.name} />)}</datalist>

      <label className="field"><span>Nome do produto</span><input name="name" required defaultValue={defaults.name} placeholder="Ex.: Brigadeiro tradicional" /></label>
      <label className="field"><span>A receita rende quantas unidades</span><input name="yield" type="number" inputMode="numeric" min={1} required value={yieldU} onChange={(e) => setYield(e.target.value)} /></label>

      <section className="stack" style={{ gap: 10 }}>
        <div className="row between"><h2 style={{ fontSize: 18 }}>Insumos</h2><span className="muted small">o que vai na receita inteira</span></div>
        {rows.map((r, i) => (
          <fieldset className="card" key={r.key} style={{ margin: 0, gap: 10 }}>
            <legend className="sr-only">Insumo {i + 1}</legend>
            <div className="row" style={{ alignItems: "flex-end" }}>
              <label className="field" style={{ flex: 1 }}><span>Insumo</span>
                <input list="insumos-conhecidos" value={r.name} onChange={(e) => update(r.key, { name: e.target.value })} placeholder="Ex.: Leite condensado" />
              </label>
              {rows.length > 1 && <button type="button" className="btn ghost sm" style={{ height: 52 }} aria-label={`Tirar ${r.name || "insumo"}`} onClick={() => setRows((rs) => rs.filter((x) => x.key !== r.key))}>Tirar</button>}
            </div>
            <label className="field"><span>Quanto vai na receita ({BASE_UNIT[r.unit] === "un" ? "unidades" : BASE_UNIT[r.unit]})</span>
              <input inputMode="decimal" value={r.qty} onChange={(e) => update(r.key, { qty: e.target.value })} placeholder={BASE_UNIT[r.unit] === "un" ? "3" : "395"} />
            </label>
            <div className="grid2" style={{ gridTemplateColumns: "1fr 1fr 1.2fr" }}>
              <label className="field"><span>Embalagem</span><input inputMode="decimal" value={r.packageQty} onChange={(e) => update(r.key, { packageQty: e.target.value })} placeholder="395" /></label>
              <label className="field"><span>Unidade</span>
                <select value={r.unit} onChange={(e) => update(r.key, { unit: e.target.value as Unit })}>
                  {(Object.keys(UNIT_LABEL) as Unit[]).map((u) => <option key={u} value={u}>{UNIT_LABEL[u]}</option>)}
                </select>
              </label>
              <label className="field"><span>Você pagou</span><input inputMode="decimal" value={r.price} onChange={(e) => update(r.key, { price: e.target.value })} placeholder="R$" /></label>
            </div>
            {r.ingredientId && <small className="muted">Já cadastrado. Se mudar o preço aqui, ele muda em todos os produtos.</small>}
          </fieldset>
        ))}
        <button type="button" className="btn ghost" onClick={() => setRows((rs) => [...rs, { key: newKey(), name: "", unit: "g", packageQty: "", price: "", qty: "" }])}>+ Insumo</button>
      </section>

      <section className="stack" style={{ gap: 12 }}>
        <h2 style={{ fontSize: 18 }}>Outros custos</h2>
        <label className="field"><span>Embalagem de cada unidade (forminha, pote, caixa)</span><input name="packaging" inputMode="decimal" value={packaging} onChange={(e) => setPackaging(e.target.value)} placeholder="0,12" /></label>
        <div className="grid2">
          <label className="field"><span>Minutos de fogão ou forno</span><input name="gas" type="number" inputMode="numeric" min={0} value={gas} onChange={(e) => setGas(e.target.value)} /></label>
          <label className="field"><span>Minutos do seu trabalho</span><input name="work" type="number" inputMode="numeric" min={0} value={work} onChange={(e) => setWork(e.target.value)} /></label>
        </div>
        <label className="field"><span>Por quanto você vende hoje (opcional)</span><input name="sale" inputMode="decimal" defaultValue={defaults.sale} placeholder="2,50" /><small>Se preencher, mostramos quanto você lucra nesse preço.</small></label>
      </section>

      <div className="card" style={{ position: "sticky", bottom: 12, gap: 4, zIndex: 3 }} aria-live="polite">
        <span className="label">Custa para fazer cada um</span>
        <span className="big md">{money(Math.round(cost.total))}</span>
        {missingPrice && <span className="small t-warn">Falta o preço de algum insumo.</span>}
      </div>

      <ErrorBox error={error} />
      <button className="btn" disabled={pending}>{pending ? "Calculando…" : "Ver preço e lucro"}</button>
    </form>
  );
}
