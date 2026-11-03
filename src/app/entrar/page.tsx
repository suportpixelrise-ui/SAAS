"use client";

import { Suspense, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import type { SupabaseClient } from "@supabase/supabase-js";
import { errorText, sb } from "@/lib/supabase";
import { ErrorBox, Loading, NotConfigured } from "@/components/ui";

// Login por link mágico (Supabase Auth): a pessoa digita o e-mail, recebe um link e entra tocando nele.
// Ao voltar pelo link, o próprio Supabase lê o endereço e abre a sessão.

const safeBack = (v: string | null) => (v && v.startsWith("/") && !v.startsWith("//") ? v : null);

/** Quando o link venceu ou já foi usado, o Supabase volta com o erro depois do # no endereço. */
function linkError(): string | null {
  const hash = new URLSearchParams(window.location.hash.slice(1));
  return hash.get("error") ? "Esse link venceu ou já foi usado. Peça um novo." : null;
}

function Entrar() {
  const router = useRouter();
  const params = useSearchParams();
  const defaultApp = process.env.NEXT_PUBLIC_APP === "sobra" ? "sobra" : "cobranca";
  const back = safeBack(params.get("volta")) ?? `/${defaultApp}/`;
  const app = back.startsWith("/sobra") ? "sobra" : "cobranca";
  const [step, setStep] = useState<"checando" | "email" | "enviado">("checando");
  const [email, setEmail] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  // O Supabase só existe no navegador: até montar, a tela mostra "carregando" (igual ao HTML gerado no build).
  const [client, setClient] = useState<SupabaseClient | null | undefined>(undefined);

  useEffect(() => setClient(sb()), []);

  useEffect(() => {
    if (!client) return;
    setError(linkError());
    const { data } = client.auth.onAuthStateChange((_event, session) => {
      if (session) router.replace(back);
      else setStep((s) => (s === "checando" ? "email" : s));
    });
    return () => data.subscription.unsubscribe();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [client]);

  async function send(e: React.FormEvent) {
    e.preventDefault();
    setPending(true);
    setError(null);
    try {
      const mail = email.trim().toLowerCase();
      const { error: failed } = await client!.auth.signInWithOtp({
        email: mail,
        options: { emailRedirectTo: `${window.location.origin}/entrar/?volta=${encodeURIComponent(back)}` },
      });
      if (failed) throw failed;
      setStep("enviado");
    } catch (err) {
      setError(errorText(err));
    } finally {
      setPending(false);
    }
  }

  if (client === undefined) return <Loading app={app} />;
  if (client === null) return <NotConfigured app={app} />;
  if (step === "checando") return <Loading app={app} />;

  return (
    <div className="app" data-app={app}>
      <main className="content no-tabs" style={{ paddingTop: 48, gap: 24 }}>
        <div className="stack" style={{ gap: 8 }}>
          <span className="label">{app === "sobra" ? "Sobra" : "Cobrança"}</span>
          <h1 className="page-title">{step === "enviado" ? "Confira seu e-mail" : "Entrar ou criar conta"}</h1>
          {step === "email" && <p className="lead">Sem senha: mandamos um link para o seu e-mail e você entra tocando nele.</p>}
        </div>

        {step === "email" && (
          <form onSubmit={send} className="stack" style={{ gap: 16 }}>
            <label className="field">
              <span>Seu e-mail</span>
              <input type="email" inputMode="email" autoComplete="email" required value={email} onChange={(e) => setEmail(e.target.value)} placeholder="voce@email.com" autoFocus />
            </label>
            <ErrorBox error={error} />
            <button className="btn" disabled={pending}>{pending ? "Enviando…" : "Receber link de acesso"}</button>
          </form>
        )}

        {step === "enviado" && (
          <div className="stack" style={{ gap: 16 }}>
            <p className="lead">Mandamos um link para <b>{email}</b>. Abra o e-mail e toque no link para entrar. Se não aparecer, olhe a caixa de spam.</p>
            <button className="btn ghost" onClick={() => setStep("email")}>Usar outro e-mail</button>
          </div>
        )}
      </main>
    </div>
  );
}

export default function Page() {
  return <Suspense fallback={null}><Entrar /></Suspense>;
}
