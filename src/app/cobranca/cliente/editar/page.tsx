"use client";

import { useSearchParams } from "next/navigation";
import { useCob } from "../../CobData";
import { ClientForm } from "../../ClientForm";
import { clientHref, CobShell, NotFound, withSuspense } from "../../shell";

function Editar() {
  const id = useSearchParams().get("id") ?? "";
  const c = useCob().clients.find((x) => x.id === id);
  if (!c) return <NotFound />;
  return (
    <CobShell back={{ href: clientHref(id), label: c.name }} title="Editar cadastro">
      <ClientForm client={c} />
    </CobShell>
  );
}

export default withSuspense(Editar);
