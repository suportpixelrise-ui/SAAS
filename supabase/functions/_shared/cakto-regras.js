// Regras dos avisos da Cakto, sem banco e sem rede, para poder testar.

import { GRACE_DAYS, GUARANTEE_DAYS, PLANS, priceFor } from "./plans.js";

const DAY = 86400_000;
const iso = (ms) => new Date(ms).toISOString();
const TOLERANCIA_MS = 5 * 60_000;

/** No aviso a assinatura vem como objeto; na API de pedidos, como texto com o id. */
export function idDaAssinatura(data) {
  const s = data?.subscription;
  return (typeof s === "string" ? s : s?.id) || null;
}

function igual(a, b) {
  if (typeof a !== "string" || typeof b !== "string" || !a || a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diff === 0;
}

async function hmacConfere(segredo, texto, hex) {
  if (!/^[0-9a-f]{64}$/i.test(hex)) return false;
  const enc = new TextEncoder();
  const key = await crypto.subtle.importKey("raw", enc.encode(segredo), { name: "HMAC", hash: "SHA-256" }, false, ["verify"]);
  const bytes = Uint8Array.from(hex.match(/../g), (b) => parseInt(b, 16));
  return crypto.subtle.verify("HMAC", key, bytes, enc.encode(texto));
}

/** Prova que o aviso veio da Cakto: pelo segredo no corpo ou pela assinatura no cabeçalho. A Cakto diz que os dois valem. */
export async function origemValida({ segredo, timestamp, assinatura, corpo, secretDoCorpo, agora = Date.now() }) {
  if (!segredo) return false;
  if (igual(segredo, secretDoCorpo)) return true;
  if (!assinatura) return false;
  const quando = Number(timestamp) * 1000;
  if (!Number.isFinite(quando) || Math.abs(agora - quando) > TOLERANCIA_MS) return false;
  return hmacConfere(segredo, `${timestamp}.${corpo}`, assinatura.replace(/^v1=/, ""));
}

/** E-mail como o login guarda: sem espaços e em minúsculas. Devolve null se não parecer um e-mail. */
export function normalizarEmail(valor) {
  const email = typeof valor === "string" ? valor.trim().toLowerCase() : "";
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) ? email : null;
}

/** O aviso é desta oferta? Ele pode trazer o código curto, o completo ou só o link. */
function daOferta(checkout, data) {
  if (!checkout) return false;
  const oferta = data?.offer?.id;
  const curta = checkout.split("_")[0];
  return oferta === checkout || oferta === curta || String(data?.checkoutUrl ?? "").includes(`/${curta}`);
}

/** Qual app foi comprado, pela oferta do aviso. A Cakto pode vender outros produtos na mesma conta. */
export function produtoDoAviso(data) {
  for (const [product, plan] of Object.entries(PLANS)) {
    if (daOferta(plan.checkout, data) || daOferta(plan.checkoutAnual, data)) return product;
  }
  return null;
}

/** O plano que foi pago vale mais que o guardado: a pessoa pode ter trocado de plano com o pagamento aberto. */
export function cicloDoAviso(data) {
  const anual = Object.values(PLANS).some((plan) => daOferta(plan.checkoutAnual, data));
  if (anual) return "anual";
  return produtoDoAviso(data) ? "mensal" : null;
}

/** Segunda assinatura paga por quem já está com uma ativa: por exemplo, duas abas de pagamento. */
export function pagamentoDuplicado(event, data, sub, agora = Date.now()) {
  const id = idDaAssinatura(data);
  return event === "purchase_approved" && Boolean(id && sub.cakto_subscription_id) && id !== sub.cakto_subscription_id
    && sub.status === "ativa" && Date.parse(sub.access_until) > agora;
}

/** O que muda na assinatura com este aviso. Devolve null quando não muda nada. */
export function mudancaDoEvento(event, data, sub, agora = Date.now()) {
  const id = idDaAssinatura(data);
  const salvo = sub.cakto_subscription_id;
  const outra = Boolean(id && salvo && id !== salvo);
  const ligacao = id && !salvo ? { cakto_subscription_id: id } : null;

  switch (event) {
    case "purchase_approved":
    case "subscription_renewed":
    case "subscription_late_recovered": {
      // Aviso repetido: o mesmo pedido não estende o acesso duas vezes.
      if (data.id && data.id === sub.last_payment_id) return ligacao;
      if (sub.status === "reembolsada" && !outra) return ligacao;
      const ciclo = cicloDoAviso(data) ?? sub.cycle;
      const fim = agora + (ciclo === "anual" ? 366 : 31) * DAY;
      return {
        ...ligacao,
        ...(ciclo !== sub.cycle ? { cycle: ciclo, price_cents: priceFor(sub.user_id, sub.product, ciclo) } : {}),
        ...(outra ? { cakto_subscription_id: id } : {}),
        status: "ativa",
        provider: "cakto",
        refunded_at: null,
        canceled_at: null,
        last_payment_id: data.id,
        current_period_end: iso(fim),
        access_until: iso(fim + GRACE_DAYS * DAY),
        ...(!sub.paid_at || outra ? { paid_at: iso(agora), refundable_until: iso(agora + GUARANTEE_DAYS * DAY), first_payment_id: data.id } : {}),
      };
    }
    case "refund":
    case "chargeback":
      // Devolução de uma assinatura em dobro não pode cortar a que vale.
      if (outra) return null;
      if (sub.status === "reembolsada") return ligacao;
      return { ...ligacao, status: "reembolsada", access_until: iso(agora), refunded_at: iso(agora), guarantee_used: true };
    case "subscription_canceled":
      if (outra) return null;
      if (["reembolsada", "cancelada"].includes(sub.status)) return ligacao;
      return { ...ligacao, status: "cancelada", canceled_at: iso(agora) };
    default:
      return ligacao;
  }
}
