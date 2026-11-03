"use client";

import { SobShell } from "../../shell";
import { OrderForm } from "../../OrderForm";

export default function NovaEncomenda() {
  return (
    <SobShell back={{ href: "/sobra/encomendas/", label: "Encomendas" }} title="Nova encomenda">
      <OrderForm />
    </SobShell>
  );
}
