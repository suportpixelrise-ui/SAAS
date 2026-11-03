"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { centsToInput } from "@/lib/format";
import { TEMPLATES } from "@/lib/sobra-templates";
import { Icon, Notice } from "@/components/ui";
import { useSob } from "../../SobData";
import { SobShell, withSuspense } from "../../shell";
import { ProductForm, type Row } from "../../ProductForm";

function NovoProduto() {
  const qs = useSearchParams();
  const modelo = qs.get("modelo");
  const { ingredients, profile } = useSob();

  if (!modelo) {
    const sorted = [...TEMPLATES.filter((t) => t.niche === profile!.niche), ...TEMPLATES.filter((t) => t.niche !== profile!.niche)];
    return (
      <SobShell back={{ href: "/sobra/produtos/", label: "Produtos" }} title="Novo produto">
        {qs.get("primeiro") && <Notice kind="ok">Pronto! Agora escolha um modelo para calcular seu primeiro preço.</Notice>}
        <p className="lead">Comece de um modelo: ele já traz as quantidades da receita. Você só coloca quanto pagou em cada insumo.</p>
        <div className="card" style={{ paddingTop: 8, paddingBottom: 8 }}>
          <div className="list">
            {sorted.map((t) => (
              <Link className="item" href={`/sobra/produtos/novo/?modelo=${t.id}`} key={t.id}>
                <span className="avatar" aria-hidden="true"><Icon name="cake" size={20} /></span>
                <div className="grow"><div className="t">{t.name}</div><div className="s">rende {t.yieldUnits} · {t.items.length} insumos</div></div>
                <Icon name="chevron-right" size={18} />
              </Link>
            ))}
          </div>
        </div>
        <Link className="btn ghost" href="/sobra/produtos/novo/?modelo=zero">Começar do zero</Link>
      </SobShell>
    );
  }

  const t = TEMPLATES.find((x) => x.id === modelo);
  const byName = new Map(ingredients.map((k) => [k.name.toLowerCase(), k]));
  const rows: Row[] = (t?.items ?? []).map((it, i) => {
    const k = byName.get(it.name.toLowerCase());
    return k
      ? { key: `t${i}`, ingredientId: k.id, name: k.name, unit: k.unit, packageQty: String(k.packageQty).replace(".", ","), price: centsToInput(k.packagePriceCents), qty: String(it.qty) }
      : { key: `t${i}`, name: it.name, unit: it.unit, packageQty: String(it.packageQty), price: "", qty: String(it.qty) };
  });

  return (
    <SobShell back={{ href: "/sobra/produtos/novo/", label: "Modelos" }} title={t ? t.name : "Novo produto"}>
      {t && <p className="lead">As quantidades são de uma receita comum. Ajuste para a sua e coloque quanto pagou em cada insumo.</p>}
      <ProductForm key={modelo} defaults={{ name: t?.name ?? "", yield: String(t?.yieldUnits ?? ""), packaging: "", gas: String(t?.gasMinutes ?? ""), work: String(t?.workMinutes ?? ""), sale: "", rows }} />
    </SobShell>
  );
}

export default withSuspense(NovoProduto);
