"use client";

import { useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { errorText } from "@/lib/supabase";
import { brl, fullDate } from "@/lib/format";
import { deleteIngredient } from "@/lib/sobra-data";
import { ErrorBox, Notice } from "@/components/ui";
import { useSob } from "../SobData";
import { NotFound, SobShell, withSuspense } from "../shell";
import { IngredientForm } from "../IngredientForm";

function Insumo() {
  const router = useRouter();
  const id = useSearchParams().get("id") ?? "";
  const { ingredients, products } = useSob();
  const [error, setError] = useState<string | null>(null);
  const i = ingredients.find((x) => x.id === id);
  if (!i) return <NotFound what="Insumo" back="/sobra/insumos/" />;
  const usedIn = products.filter((p) => p.items.some((it) => it.ingredientId === id));

  async function remove() {
    try {
      await deleteIngredient(id);
      router.replace("/sobra/insumos/?removido=1");
    } catch (err) {
      setError(errorText(err));
    }
  }

  return (
    <SobShell back={{ href: "/sobra/insumos/", label: "Insumos" }} title={i.name}>
      <IngredientForm ingredient={i} />
      {i.history?.length > 1 && (
        <section className="card">
          <h2>Preços anteriores</h2>
          <div className="list">
            {i.history.map((h, k) => (
              <div className="item" key={k} style={{ minHeight: 40 }}>
                <span className="grow muted">{fullDate(h.at.slice(0, 10))}</span>
                <span className="num">{String(h.packageQty).replace(".", ",")} {i.unit} por <b>{brl(h.packagePriceCents)}</b></span>
              </div>
            ))}
          </div>
        </section>
      )}
      <ErrorBox error={error} />
      {usedIn.length > 0
        ? <Notice kind="info">Usado em: {usedIn.map((p) => p.name).join(", ")}. Para apagar, tire ele dessas receitas antes.</Notice>
        : <button className="btn danger" onClick={remove}>Apagar insumo</button>}
    </SobShell>
  );
}

export default withSuspense(Insumo);
