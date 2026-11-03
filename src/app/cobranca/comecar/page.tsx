"use client";

import { useRouter } from "next/navigation";
import { AppShell } from "@/components/ui";
import { useCob } from "../CobData";
import { SetupForm } from "../SetupForm";

export default function ComecarPage() {
  const router = useRouter();
  const { profile } = useCob();
  return (
    <AppShell app="cobranca">
      <div className="stack" style={{ gap: 6, paddingTop: 20 }}>
        <span className="label">Cobrança</span>
        <h1 className="page-title">Vamos deixar tudo pronto</h1>
        <p className="lead">São 3 perguntas rápidas. Depois você cadastra o primeiro cliente e já pode cobrar.</p>
      </div>
      <SetupForm initial={profile} submitLabel="Continuar" onSaved={() => router.replace("/cobranca/clientes/novo/?primeiro=1")} />
    </AppShell>
  );
}
