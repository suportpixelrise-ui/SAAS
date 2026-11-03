"use client";

import { SobShell } from "../../shell";
import { IngredientForm } from "../../IngredientForm";

export default function NovoInsumo() {
  return (
    <SobShell back={{ href: "/sobra/insumos/", label: "Insumos" }} title="Novo insumo">
      <IngredientForm />
    </SobShell>
  );
}
