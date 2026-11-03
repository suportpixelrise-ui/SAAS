"use client";

import Link from "next/link";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { sb } from "@/lib/supabase";
import { brl } from "@/lib/format";
import { useSession } from "@/lib/session";
import { profileHourCost } from "@/lib/sobra-core";
import { Notice } from "@/components/ui";
import { useSob } from "../SobData";
import { SobShell } from "../shell";
import { SobraSetupForm } from "../SobraSetupForm";

export default function AjustesSobra() {
  const router = useRouter();
  const { sub } = useSession();
  const { email, profile } = useSob();
  const [saved, setSaved] = useState(false);

  return (
    <SobShell back={{ href: "/sobra/", label: "Início" }} title="Ajustes">
      {saved && <Notice kind="ok">Dados salvos. Os custos foram recalculados.</Notice>}
      <Link href="/sobra/assinatura/" className="card" style={{ textDecoration: "none", color: "inherit" }}>
        <span className="label">Assinatura</span>
        <div className="row between">
          <b>{sub?.status === "cancelada" ? "Cancelada" : "Ativa"}</b>
          {sub && <span className="num muted">{brl(sub.priceCents)}/{sub.cycle === "anual" ? "ano" : "mês"}</span>}
        </div>
        <span className="muted small">Ver plano, garantia ou cancelar</span>
      </Link>
      <section className="card">
        <h2>Sua hora, o gás e o lucro</h2>
        <p className="muted small">Hoje sua hora vale {brl(Math.round(profileHourCost(profile!)))} e o gás custa {brl(profile!.gasCostPerHourCents)} por hora.</p>
        <SobraSetupForm initial={profile} submitLabel="Salvar" onSaved={() => { setSaved(true); window.scrollTo({ top: 0, behavior: "smooth" }); }} />
      </section>
      <p className="muted small">Conta: {email}</p>
      <button className="btn ghost" onClick={async () => { await sb()!.auth.signOut(); router.replace("/"); }}>Sair</button>
    </SobShell>
  );
}
