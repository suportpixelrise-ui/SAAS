"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { brl } from "@/lib/format";
import { priceProduct } from "@/lib/sobra-core";
import { Empty, Icon, Notice } from "@/components/ui";
import { useSob } from "../SobData";
import { productHref, SobShell, withSuspense } from "../shell";

function Produtos() {
  const qs = useSearchParams();
  const { products, ingMap, profile } = useSob();
  const list = products.map((p) => priceProduct(p, ingMap, profile!));

  return (
    <SobShell active="produtos" title="Produtos">
      {qs.get("removido") && <Notice kind="ok">Produto apagado.</Notice>}
      {list.length === 0 ? (
        <Empty icon="tag" title="Nenhum produto ainda" text="Escolha um modelo pronto e descubra o custo e o lucro em poucos minutos." action={<Link className="btn" href="/sobra/produtos/novo/">Calcular meu primeiro preço</Link>} />
      ) : (
        <section className="card" style={{ paddingTop: 8, paddingBottom: 8 }}>
          <div className="list">
            {list.map((p) => (
              <Link className="item" href={productHref(p.id)} key={p.id}>
                <div className="grow">
                  <div className="t">{p.name}</div>
                  <div className="s">custa {brl(Math.round(p.cost.total))}{p.salePriceCents != null ? ` · vende a ${brl(p.salePriceCents)}` : " · sem preço de venda"}</div>
                </div>
                {p.profit != null
                  ? <span className={`pill ${p.profit >= 0 ? "ok" : "bad"}`}>{p.profit >= 0 ? "+" : "−"}{brl(Math.abs(Math.round(p.profit)))}</span>
                  : <span className="pill warn">Ver preço</span>}
              </Link>
            ))}
          </div>
        </section>
      )}
      {list.length > 0 && <Link className="btn dark fab" href="/sobra/produtos/novo/"><Icon name="plus" size={20} /> Produto</Link>}
    </SobShell>
  );
}

export default withSuspense(Produtos);
