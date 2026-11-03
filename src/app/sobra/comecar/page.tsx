"use client";

import { useRouter } from "next/navigation";
import { AppShell } from "@/components/ui";
import { useSob } from "../SobData";
import { SobraSetupForm } from "../SobraSetupForm";

export default function ComecarSobra() {
  const router = useRouter();
  const { profile } = useSob();
  return (
    <AppShell app="sobra">
      <div className="stack" style={{ gap: 6, paddingTop: 20 }}>
        <span className="label">Sobra</span>
        <h1 className="page-title">Vamos achar o seu preço certo</h1>
        <p className="lead">Três perguntas e depois o seu primeiro produto. Em poucos minutos você sabe quanto lucra em cada venda.</p>
      </div>
      <SobraSetupForm initial={profile} submitLabel="Continuar" onSaved={() => router.replace("/sobra/produtos/novo/?primeiro=1")} />
    </AppShell>
  );
}
