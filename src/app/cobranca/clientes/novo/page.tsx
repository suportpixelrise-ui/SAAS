"use client";

import { useSearchParams } from "next/navigation";
import { Notice } from "@/components/ui";
import { useCob } from "../../CobData";
import { ClientForm } from "../../ClientForm";
import { CobShell, withSuspense } from "../../shell";

function NovoCliente() {
  const qs = useSearchParams();
  const { w } = useCob();
  return (
    <CobShell back={{ href: "/cobranca/clientes/", label: w.Many }} title={`Novo ${w.one}`}>
      {qs.get("primeiro") && <Notice kind="ok">Pronto! Agora cadastre seu primeiro {w.one}. Depois é só tocar em “Salvar e cobrar”.</Notice>}
      <ClientForm />
    </CobShell>
  );
}

export default withSuspense(NovoCliente);
