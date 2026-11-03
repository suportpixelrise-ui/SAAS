"use client";

import { useSearchParams } from "next/navigation";
import { centsToInput } from "@/lib/format";
import { useSob } from "../../SobData";
import { NotFound, productHref, SobShell, withSuspense } from "../../shell";
import { ProductForm } from "../../ProductForm";

function EditarProduto() {
  const id = useSearchParams().get("id") ?? "";
  const { products, ingMap } = useSob();
  const p = products.find((x) => x.id === id);
  if (!p) return <NotFound what="Produto" back="/sobra/produtos/" />;
  const rows = p.items.flatMap((it, i) => {
    const k = ingMap.get(it.ingredientId);
    return k ? [{ key: `e${i}`, ingredientId: k.id, name: k.name, unit: k.unit, packageQty: String(k.packageQty).replace(".", ","), price: centsToInput(k.packagePriceCents), qty: String(it.qty).replace(".", ",") }] : [];
  });
  return (
    <SobShell back={{ href: productHref(id), label: p.name }} title="Editar receita">
      <ProductForm
        product={p}
        defaults={{ id, name: p.name, yield: String(p.yieldUnits), packaging: p.packagingCents ? centsToInput(p.packagingCents) : "", gas: String(p.gasMinutes), work: String(p.workMinutes), sale: p.salePriceCents != null ? centsToInput(p.salePriceCents) : "", rows }}
      />
    </SobShell>
  );
}

export default withSuspense(EditarProduto);
