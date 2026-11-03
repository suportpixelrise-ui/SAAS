"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { brl } from "@/lib/format";
import { BASE_UNIT, costPerBase } from "@/lib/sobra-calc";
import { Empty, Icon, Notice } from "@/components/ui";
import { useSob } from "../SobData";
import { ingredientHref, SobShell, withSuspense } from "../shell";

/** Preço por g/ml/unidade com casas suficientes para não virar "R$ 0,00". */
function perBase(cents: number, base: string) {
  const reais = cents / 100;
  const digits = reais < 0.1 ? 4 : reais < 1 ? 3 : 2;
  return `R$ ${reais.toLocaleString("pt-BR", { minimumFractionDigits: digits, maximumFractionDigits: digits })}/${base === "un" ? "un." : base}`;
}

function Insumos() {
  const qs = useSearchParams();
  const { ingredients } = useSob();

  return (
    <SobShell active="insumos" title="Insumos">
      {qs.get("salvo") && <Notice kind="ok">Insumo salvo.</Notice>}
      {qs.get("removido") && <Notice kind="ok">Insumo apagado.</Notice>}
      {ingredients.length === 0 ? (
        <Empty icon="box" title="Nenhum insumo ainda" text="Os insumos entram aqui sozinhos quando você calcula um produto. Também dá para cadastrar antes." action={<Link className="btn" href="/sobra/insumos/novo/">Cadastrar insumo</Link>} />
      ) : (
        <section className="card" style={{ paddingTop: 8, paddingBottom: 8 }}>
          <div className="list">
            {ingredients.map((i) => {
              const now = costPerBase(i.packagePriceCents, i.packageQty, i.unit);
              const before = i.previousPriceCents != null ? costPerBase(i.previousPriceCents, i.previousPackageQty ?? i.packageQty, i.unit) : null;
              const up = before != null && now > before + 1e-9;
              const down = before != null && now < before - 1e-9;
              return (
                <Link className="item" href={ingredientHref(i.id)} key={i.id}>
                  <div className="grow">
                    <div className="t">{i.name}</div>
                    <div className="s">{String(i.packageQty).replace(".", ",")} {i.unit === "l" ? "litro" : i.unit === "un" ? "un." : i.unit} · {brl(i.packagePriceCents)} · {perBase(now, BASE_UNIT[i.unit])}</div>
                  </div>
                  {up && <span className="pill warn" title="Subiu desde a última compra">▲ {Math.round(((now - before!) / before!) * 100)}%</span>}
                  {down && <span className="pill ok" title="Baixou desde a última compra">▼ {Math.round(((before! - now) / before!) * 100)}%</span>}
                </Link>
              );
            })}
          </div>
        </section>
      )}
      {ingredients.length > 0 && <Link className="btn dark fab" href="/sobra/insumos/novo/"><Icon name="plus" size={20} /> Insumo</Link>}
    </SobShell>
  );
}

export default withSuspense(Insumos);
