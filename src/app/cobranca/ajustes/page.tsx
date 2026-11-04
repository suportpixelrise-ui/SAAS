"use client";

import Link from "next/link";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { sb } from "@/lib/supabase";
import { brl } from "@/lib/format";
import { useSession } from "@/lib/session";
import { Notice } from "@/components/ui";
import { useCob } from "../CobData";
import { ajudaLink } from "@/lib/empresa";
import { CobShell } from "../shell";
import { SetupForm } from "../SetupForm";

export default function Ajustes() {
  const router = useRouter();
  const { sub } = useSession();
  const { email, profile } = useCob();
  const [saved, setSaved] = useState(false);

  return (
    <CobShell active="ajustes" title="Ajustes">
      {saved && <Notice kind="ok">Dados salvos.</Notice>}
      <Link href="/cobranca/assinatura/" className="card" style={{ textDecoration: "none", color: "inherit" }}>
        <span className="label">Assinatura</span>
        <div className="row between">
          <b>{sub?.status === "cancelada" ? "Cancelada" : "Ativa"}</b>
          {sub && <span className="num muted">{brl(sub.priceCents)}/{sub.cycle === "anual" ? "ano" : "mês"}</span>}
        </div>
        <span className="muted small">Ver plano, garantia ou cancelar</span>
      </Link>
      <section className="card">
        <h2>Seus dados e o Pix</h2>
        <SetupForm initial={profile} submitLabel="Salvar" onSaved={() => { setSaved(true); window.scrollTo({ top: 0, behavior: "smooth" }); }} />
      </section>
      <p className="muted small">Conta: {email}</p>
      <a className="btn ghost" href={ajudaLink("Facilita IA")} target="_blank" rel="noopener">Falar com o suporte</a>
      <Link className="btn ghost" href="/entrar/?nova=1&volta=/cobranca/ajustes/">Trocar minha senha</Link>
      <button className="btn ghost" onClick={async () => { await sb()!.auth.signOut(); router.replace("/"); }}>Sair</button>
    </CobShell>
  );
}
