"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { errorText } from "@/lib/supabase";
import { centsToInput, parseBRL } from "@/lib/format";
import { UNITS, type Unit } from "@/lib/sobra-calc";
import type { Ingredient } from "@/lib/sobra-core";
import { createIngredient, updateIngredient } from "@/lib/sobra-data";
import { ErrorBox } from "@/components/ui";
import { useSob } from "./SobData";

export function IngredientForm({ ingredient }: { ingredient?: Ingredient }) {
  const router = useRouter();
  const { ingredients } = useSob();
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  async function submit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const f = new FormData(e.currentTarget);
    const name = String(f.get("name") ?? "").trim();
    const unit = String(f.get("unit")) as Unit;
    const qty = Number(String(f.get("package_qty") ?? "").replace(",", "."));
    const price = parseBRL(String(f.get("price") ?? ""));
    if (name.length < 2) return setError("Digite o nome do insumo.");
    if (!UNITS.includes(unit)) return setError("Escolha a unidade.");
    if (!Number.isFinite(qty) || qty <= 0) return setError("Digite o tamanho da embalagem.");
    if (!price || price <= 0) return setError("Digite quanto você pagou.");
    if (!ingredient && ingredients.some((i) => i.name.toLowerCase() === name.toLowerCase())) return setError("Já existe um insumo com esse nome.");
    setPending(true);
    setError(null);
    try {
      if (ingredient) await updateIngredient(ingredient, name, unit, qty, price);
      else await createIngredient(name, unit, qty, price);
      router.push("/sobra/insumos/?salvo=1");
    } catch (err) {
      setError(errorText(err));
      setPending(false);
    }
  }

  return (
    <form onSubmit={submit} className="stack" style={{ gap: 14 }}>
      <label className="field"><span>Nome</span><input name="name" required defaultValue={ingredient?.name} placeholder="Ex.: Leite condensado" /></label>
      <div className="grid2">
        <label className="field"><span>Tamanho da embalagem</span><input name="package_qty" inputMode="decimal" required defaultValue={ingredient ? String(ingredient.packageQty).replace(".", ",") : ""} placeholder="395" /></label>
        <label className="field"><span>Unidade</span>
          <select name="unit" defaultValue={ingredient?.unit ?? "g"}>
            <option value="g">g</option><option value="kg">kg</option><option value="ml">ml</option><option value="l">litro</option><option value="un">unidade</option>
          </select>
        </label>
      </div>
      <label className="field"><span>Quanto você pagou</span><input name="price" inputMode="decimal" required defaultValue={ingredient ? centsToInput(ingredient.packagePriceCents) : ""} placeholder="7,49" /><small>Quando o preço subir, troque aqui: o app avisa quanto isso tira do seu lucro.</small></label>
      <ErrorBox error={error} />
      <button className="btn" disabled={pending}>{pending ? "Salvando…" : "Salvar"}</button>
    </form>
  );
}
