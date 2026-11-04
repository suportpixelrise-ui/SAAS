"use client";

import Link from "next/link";
import type { ReactNode } from "react";
import { AppShell, TabBar } from "@/components/ui";
import { useCob } from "./CobData";

type Tab = "inicio" | "clientes" | "lembretes" | "ajustes";

export function CobShell({ active, children, back, title, wide }: { active?: Tab; children: ReactNode; back?: { href: string; label: string }; title?: string; wide?: boolean }) {
  const { w, pendingReminders } = useCob();
  return (
    <AppShell
      app="cobranca"
      back={back}
      title={title}
      wide={wide}
      sub={!active}
      tabs={
        <TabBar
          brand={{ name: "Facilita IA", href: "/cobranca/" }}
          active={active}
          items={[
            { key: "inicio", href: "/cobranca/", label: "Início", icon: "home" },
            { key: "clientes", href: "/cobranca/clientes/", label: w.Many, icon: "users" },
            { key: "lembretes", href: "/cobranca/lembretes/", label: "Lembretes", icon: "bell", badge: pendingReminders },
            { key: "ajustes", href: "/cobranca/ajustes/", label: "Ajustes", icon: "settings" },
          ]}
        />
      }
    >
      {children}
    </AppShell>
  );
}

export { withSuspense } from "@/components/withSuspense";

export const clientHref = (id: string, sub = "") => `/cobranca/cliente/${sub ? `${sub}/` : ""}?id=${encodeURIComponent(id)}`;

export function NotFound({ what = "Cadastro" }: { what?: string }) {
  return (
    <CobShell back={{ href: "/cobranca/clientes/", label: "Voltar" }}>
      <h1 className="page-title">{what} não encontrado</h1>
      <Link className="btn ghost" href="/cobranca/clientes/">Ver a lista</Link>
    </CobShell>
  );
}
