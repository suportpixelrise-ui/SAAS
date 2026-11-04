"use client";

import Link from "next/link";
import type { ReactNode } from "react";
import { AppShell, TabBar } from "@/components/ui";
import { useSob } from "./SobData";

export { withSuspense } from "@/components/withSuspense";

type Tab = "inicio" | "produtos" | "insumos" | "encomendas";

export function SobShell({ active, children, back, title, wide }: { active?: Tab; children: ReactNode; back?: { href: string; label: string }; title?: string; wide?: boolean }) {
  const { alerts } = useSob();
  return (
    <AppShell
      app="sobra"
      back={back}
      title={title}
      wide={wide}
      sub={!active}
      tabs={
        <TabBar
          brand={{ name: "Sobra", href: "/sobra/" }}
          active={active}
          items={[
            { key: "inicio", href: "/sobra/", label: "Início", icon: "home", badge: alerts.length },
            { key: "produtos", href: "/sobra/produtos/", label: "Produtos", icon: "tag" },
            { key: "insumos", href: "/sobra/insumos/", label: "Insumos", icon: "box" },
            { key: "encomendas", href: "/sobra/encomendas/", label: "Encomendas", icon: "calendar" },
          ]}
        />
      }
    >
      {children}
    </AppShell>
  );
}

export const productHref = (id: string, sub = "") => `/sobra/produto/${sub ? `${sub}/` : ""}?id=${encodeURIComponent(id)}`;
export const ingredientHref = (id: string) => `/sobra/insumo/?id=${encodeURIComponent(id)}`;
export const orderHref = (id: string) => `/sobra/encomenda/?id=${encodeURIComponent(id)}`;

export function NotFound({ what, back }: { what: string; back: string }) {
  return (
    <SobShell back={{ href: back, label: "Voltar" }}>
      <h1 className="page-title">{what} não encontrado</h1>
      <Link className="btn ghost" href={back}>Voltar para a lista</Link>
    </SobShell>
  );
}
