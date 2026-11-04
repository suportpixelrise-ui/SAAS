"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { call, errorText, sb } from "@/lib/supabase";
import { canRefund, hasAccess, useSession } from "@/lib/session";
import { GUARANTEE_DAYS, PRODUCTS, priceFor, type ProductId } from "@/lib/products";
import { brl, fullDate } from "@/lib/format";
import { AppShell, ErrorBox, Icon, Notice } from "./ui";

const criar = (data: { product: ProductId; cycle: string; name?: string; cpfCnpj?: string }) => call<{ url?: string; simulated?: boolean }>("assinatura", { acao: "criar", ...data });
const reembolsar = (data: { product: ProductId }) => call<{ ok: boolean }>("assinatura", { acao: "reembolso", ...data });
const cancelar = (data: { product: ProductId }) => call<{ ok: boolean }>("assinatura", { acao: "cancelar", ...data });

const dateOf = (iso: string | null | undefined) => (iso ? fullDate(iso.slice(0, 10)) : "");

/** Assinatura cobrada na hora, com garantia de 7 dias e dinheiro de volta. Igual nos dois apps. */
export function Assinatura({ product }: { product: ProductId }) {
  const router = useRouter();
  const { user, sub } = useSession();
  const p = PRODUCTS[product];
  const access = hasAccess(sub);
  const [cycle, setCycle] = useState<"mensal" | "anual">(p.yearlyPrice ? "anual" : "mensal");
  const [name, setName] = useState("");
  const [doc, setDoc] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState<string | null>(null);
  const [confirmRefund, setConfirmRefund] = useState(false);
  const simulated = Boolean(window.APP_CONFIG?.pagamentoSimulado);
  const monthly = priceFor(user.uid, product, "mensal");

  // Quando o pagamento é confirmado, a assinatura muda sozinha e a pessoa vai para o app.
  const hadAccess = useRef(access);
  useEffect(() => {
    if (!hadAccess.current && access && sub?.status === "ativa") router.replace(`${p.home}?assinou=1`);
    hadAccess.current = access;
  }, [access, sub?.status, router, p.home]);

  async function run(label: string, fn: () => Promise<unknown>) {
    setPending(label);
    setError(null);
    try {
      await fn();
    } catch (err) {
      setError(errorText(err));
    } finally {
      setPending(null);
    }
  }

  async function subscribe(e: React.FormEvent) {
    e.preventDefault();
    await run("assinar", async () => {
      const res = await criar({ product, cycle, name: simulated ? undefined : name, cpfCnpj: simulated ? undefined : doc });
      if (res.url) window.location.href = res.url;
    });
  }

  const header = (title: string) => (
    <div className="stack" style={{ gap: 6 }}>
      <span className="label">{p.name}</span>
      <h1 className="page-title">{title}</h1>
    </div>
  );

  // ---------- assinante ----------
  if (sub && access) {
    const refundable = canRefund(sub);
    return (
      <AppShell app={product} back={{ href: p.home, label: p.name }}>
        {header(sub.status === "cancelada" ? "Assinatura cancelada" : "Sua assinatura está ativa")}
        <div className="card">
          <div className="kv"><span>Plano</span><b>{brl(sub.priceCents)} por {sub.cycle === "anual" ? "ano" : "mês"}</b></div>
          {sub.currentPeriodEnd && <div className="kv"><span>{sub.status === "cancelada" ? "Acesso até" : "Próxima cobrança"}</span><b>{dateOf(sub.currentPeriodEnd)}</b></div>}
          <div className="kv"><span>Preço</span><b>travado por 12 meses</b></div>
        </div>

        {refundable && (
          <section className="card">
            <h2>Garantia de {GUARANTEE_DAYS} dias</h2>
            <p className="muted">Não gostou? Peça o dinheiro de volta até <b>{dateOf(sub.refundableUntil)}</b>. Devolvemos o valor e encerramos a assinatura.</p>
            {!confirmRefund ? (
              <button className="btn ghost" onClick={() => setConfirmRefund(true)}>Pedir meu dinheiro de volta</button>
            ) : (
              <div className="stack">
                <p className="small">Tem certeza? Você perde o acesso agora e seus dados ficam guardados caso volte.</p>
                <button className="btn danger" disabled={!!pending} onClick={() => run("reembolso", () => reembolsar({ product }))}>{pending === "reembolso" ? "Pedindo…" : "Sim, quero o reembolso"}</button>
                <button className="link-btn" onClick={() => setConfirmRefund(false)}>Voltar</button>
              </div>
            )}
          </section>
        )}

        <ErrorBox error={error} />
        {sub.status === "ativa" && (
          <div className="stack">
            <button className="btn danger" disabled={!!pending} onClick={() => run("cancelar", () => cancelar({ product }))}>{pending === "cancelar" ? "Cancelando…" : "Cancelar assinatura"}</button>
            <p className="muted small">Para as próximas cobranças. Você continua usando até o fim do período pago.</p>
          </div>
        )}
        <SignOut />
      </AppShell>
    );
  }

  // ---------- esperando o pagamento ----------
  if (sub?.status === "pendente") {
    return (
      <div className="split night" data-app={product}>
        <Pitch product={product} />
        <main className="split-form">
          <div className="in">
            <Track step={2} />
            <h2>Falta só o pagamento</h2>
            <Notice kind="info">Assim que o pagamento for confirmado, o app abre sozinho aqui. No Pix e no cartão leva segundos; no boleto, até 3 dias úteis.</Notice>
            {sub.invoiceUrl && <a className="btn pay-btn" href={sub.invoiceUrl}>Abrir o pagamento</a>}
            <SignOut />
          </div>
        </main>
      </div>
    );
  }

  // ---------- tela de assinar ----------
  const price = cycle === "anual" && p.yearlyPrice ? p.yearlyPrice : monthly;
  const yearlySaving = p.yearlyPrice ? monthly * 12 - p.yearlyPrice : 0;
  const hasGuarantee = !sub?.guaranteeUsed;
  return (
    <div className="split night" data-app={product}>
      <Pitch product={product} guarantee={hasGuarantee} />
      <main className="split-form">
        <form onSubmit={subscribe} className="in">
          <Track step={2} />
          <h2>Escolha como pagar</h2>
          {sub?.status === "reembolsada" && <Notice kind="ok">Seu pagamento foi devolvido. Seus dados continuam guardados se quiser voltar.</Notice>}
          {sub?.status === "cancelada" && <Notice kind="warn">Sua assinatura acabou. Seus dados continuam guardados: é só assinar para voltar.</Notice>}

          <div className="stack" style={{ gap: 8 }}>
            {p.yearlyPrice && (
              <label className="plan-opt">
                <input type="radio" name="ciclo" checked={cycle === "anual"} onChange={() => setCycle("anual")} />
                <span>
                  <i className="dot" />
                  <span><b>Anual {yearlySaving > 0 && <em className="save" style={{ fontStyle: "normal" }}>economize {brl(yearlySaving)}</em>}</b><small>Sai {brl(Math.round(p.yearlyPrice / 12))} por mês</small></span>
                  <span className="val">{brl(p.yearlyPrice)}</span>
                </span>
              </label>
            )}
            <label className="plan-opt">
              <input type="radio" name="ciclo" checked={cycle === "mensal"} onChange={() => setCycle("mensal")} />
              <span>
                <i className="dot" />
                <span><b>Mensal</b><small>Cancele quando quiser</small></span>
                <span className="val">{brl(monthly)}</span>
              </span>
            </label>
          </div>

          {simulated ? (
            <Notice kind="info">Modo de teste: o pagamento é simulado e a assinatura ativa na hora.</Notice>
          ) : (
            <>
              <label className="field"><span>Nome completo</span><input value={name} onChange={(e) => setName(e.target.value)} autoComplete="name" required /></label>
              <label className="field"><span>CPF ou CNPJ</span><input value={doc} onChange={(e) => setDoc(e.target.value)} inputMode="numeric" required /><small>Necessário para gerar a cobrança.</small></label>
            </>
          )}

          <div className="total"><span className="muted">Você paga hoje</span><b>{brl(price)}</b></div>
          <ErrorBox error={error} />
          <button className="btn pay-btn" disabled={!!pending}>{pending ? "Abrindo o pagamento…" : simulated ? "Assinar (pagamento simulado)" : `Assinar por ${brl(price)}`}</button>
          <div className="trust">
            <span><Icon name="check" size={16} /> Pague com Pix, boleto ou cartão, em ambiente seguro do Asaas</span>
            <span><Icon name="check" size={16} /> Preço travado por 12 meses</span>
            {hasGuarantee && <span><Icon name="check" size={16} /> {GUARANTEE_DAYS} dias para pedir o dinheiro de volta no app</span>}
          </div>
          <SignOut />
        </form>
      </main>
    </div>
  );
}

function Track({ step }: { step: number }) {
  const items = ["Conta criada", "Pagamento", "Usar o app"];
  return (
    <ol className="track" aria-label={`Passo ${step} de ${items.length}`}>
      {items.map((t, i) => (
        <li key={t} className={i + 1 < step ? "done" : i + 1 === step ? "on" : ""}><i>{i + 1 < step ? "✓" : i + 1}</i>{t}</li>
      ))}
    </ol>
  );
}

function Pitch({ product, guarantee = true }: { product: ProductId; guarantee?: boolean }) {
  const p = PRODUCTS[product];
  return (
    <aside className="split-pitch">
      <a className="brandmark" href="/">{p.name}</a>
      <h1>{p.paywallTitle[0]} <span className="serif">{p.paywallTitle[1]}</span></h1>
      <div className="stack">{p.benefits.map((b) => <span key={b} className="check">{b}</span>)}</div>
      {guarantee && <div className="seal"><i>{GUARANTEE_DAYS}</i><div><b>Dias de garantia</b><span>Não gostou? Peça o dinheiro de volta no próprio app.</span></div></div>}
    </aside>
  );
}

function SignOut() {
  const router = useRouter();
  return <button className="link-btn" style={{ alignSelf: "center" }} onClick={async () => { await sb()!.auth.signOut(); router.replace("/"); }}>Sair da conta</button>;
}
