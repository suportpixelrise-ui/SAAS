"use client";

import Link from "next/link";
import { Suspense, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import type { SupabaseClient } from "@supabase/supabase-js";
import { errorText, sb } from "@/lib/supabase";
import { PRODUCTS } from "@/lib/products";
import { ErrorBox, Loading, NotConfigured, Notice } from "@/components/ui";

// Login com e-mail e senha (Supabase Auth). O e-mail só é usado em "esqueci minha senha".

const safeBack = (v: string | null) => (v && v.startsWith("/") && !v.startsWith("//") ? v : null);

type Step = "checando" | "criar" | "entrar" | "esqueci" | "enviado" | "nova";

function Entrar() {
  const router = useRouter();
  const params = useSearchParams();
  const defaultApp = process.env.NEXT_PUBLIC_APP === "sobra" ? "sobra" : "cobranca";
  const back = safeBack(params.get("volta")) ?? `/${defaultApp}/`;
  const app = back.startsWith("/sobra") ? "sobra" : "cobranca";
  const recovering = params.has("nova");
  const p = PRODUCTS[app];
  const [step, setStep] = useState<Step>("checando");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [show, setShow] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  // O Supabase só existe no navegador: até montar, a tela mostra "carregando" (igual ao HTML gerado no build).
  const [client, setClient] = useState<SupabaseClient | null | undefined>(undefined);

  useEffect(() => setClient(sb()), []);

  useEffect(() => {
    if (!client) return;
    const { data } = client.auth.onAuthStateChange((_event, session) => {
      if (session && recovering) setStep("nova");
      else if (session) router.replace(back);
      else setStep((s) => (s === "checando" ? "criar" : s));
    });
    return () => data.subscription.unsubscribe();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [client]);

  function go(next: Step) {
    setError(null);
    setStep(next);
  }

  async function run(fn: () => Promise<void>) {
    setPending(true);
    setError(null);
    try {
      await fn();
    } catch (err) {
      setError(errorText(err));
    } finally {
      setPending(false);
    }
  }

  const mail = () => email.trim().toLowerCase();

  function submit(e: React.FormEvent) {
    e.preventDefault();
    void run(async () => {
      if (step === "criar") {
        const { data, error: failed } = await client!.auth.signUp({ email: mail(), password });
        if (failed) throw failed;
        // Com a confirmação de e-mail desligada, a conta já entra. Se estiver ligada, o aviso abaixo explica.
        if (!data.session) setStep("enviado");
      } else if (step === "entrar") {
        const { error: failed } = await client!.auth.signInWithPassword({ email: mail(), password });
        if (failed) throw failed;
      } else if (step === "esqueci") {
        const { error: failed } = await client!.auth.resetPasswordForEmail(mail(), { redirectTo: `${window.location.origin}/entrar/?nova=1&volta=${encodeURIComponent(back)}` });
        if (failed) throw failed;
        setStep("enviado");
      } else if (step === "nova") {
        const { error: failed } = await client!.auth.updateUser({ password });
        if (failed) throw failed;
        router.replace(back);
      }
    });
  }

  if (client === undefined) return <Loading app={app} />;
  if (client === null) return <NotConfigured app={app} />;
  if (step === "checando") return <Loading app={app} />;

  const title = { criar: "Crie sua conta", entrar: "Entre na sua conta", esqueci: "Recupere sua senha", enviado: "Confira seu e-mail", nova: "Crie uma senha nova" }[step];
  const action = { criar: "Criar conta e continuar", entrar: "Entrar", esqueci: "Enviar link", nova: "Salvar senha" } as Record<Step, string>;
  const wantsPassword = step === "criar" || step === "entrar" || step === "nova";

  return (
    <div className="split night" data-app={app}>
      <aside className="split-pitch">
        <Link className="brandmark" href="/">{p.name}</Link>
        <h1>{app === "sobra" ? "Descubra quanto" : "Receba todo mês"} <span className="serif">{app === "sobra" ? "sobra de verdade." : "sem correr atrás."}</span></h1>
        <p className="sub">{p.tagline}</p>
      </aside>

      <main className="split-form">
        <div className="in">
          {(step === "criar" || step === "entrar") && (
            <div className="seg" role="group" aria-label="Criar conta ou entrar">
              <button type="button" aria-pressed={step === "criar"} onClick={() => go("criar")}>Criar conta</button>
              <button type="button" aria-pressed={step === "entrar"} onClick={() => go("entrar")}>Já tenho conta</button>
            </div>
          )}
          <h2>{title}</h2>

          {step === "enviado" ? (
            <>
              <Notice kind="info">Mandamos um link para <b>{email}</b>. Abra o e-mail e toque no link. Se não aparecer, olhe a caixa de spam.</Notice>
              <button className="btn ghost" onClick={() => go("entrar")}>Voltar para entrar</button>
            </>
          ) : (
            <form onSubmit={submit} className="stack" style={{ gap: 14 }}>
              {step !== "nova" && (
                <label className="field">
                  <span>E-mail</span>
                  <input type="email" inputMode="email" autoComplete="email" required value={email} onChange={(e) => setEmail(e.target.value)} placeholder="voce@email.com" autoFocus />
                </label>
              )}
              {wantsPassword && (
                <label className="field">
                  <span>{step === "entrar" ? "Senha" : "Crie uma senha"}</span>
                  <input type={show ? "text" : "password"} autoComplete={step === "entrar" ? "current-password" : "new-password"} required minLength={8} value={password} onChange={(e) => setPassword(e.target.value)} />
                  <small>{step === "entrar" ? "" : "Pelo menos 8 caracteres."}</small>
                </label>
              )}
              {wantsPassword && <button type="button" className="link-btn" style={{ alignSelf: "flex-start", minHeight: 0, padding: 0 }} onClick={() => setShow((s) => !s)}>{show ? "Esconder a senha" : "Mostrar a senha"}</button>}
              <ErrorBox error={error} />
              <button className="btn pay-btn" disabled={pending}>{pending ? "Aguarde…" : action[step]}</button>
              {step === "entrar" && <button type="button" className="link-btn" onClick={() => go("esqueci")}>Esqueci minha senha</button>}
              {step === "esqueci" && <button type="button" className="link-btn" onClick={() => go("entrar")}>Voltar para entrar</button>}
            </form>
          )}
        </div>
      </main>
    </div>
  );
}

export default function Page() {
  return <Suspense fallback={null}><Entrar /></Suspense>;
}
