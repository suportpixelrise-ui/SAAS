// Regras dos avisos da Cakto, sem banco e sem rede, para poder testar.

import { GRACE_DAYS, GUARANTEE_DAYS } from "./plans.js";

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

/** Prova que o aviso veio da Cakto: pela assinatura no cabeçalho ou, sem ela, pelo segredo no corpo. */
export async function origemValida({ segredo, timestamp, assinatura, corpo, secretDoCorpo, agora = Date.now() }) {
  if (!segredo) return false;
  if (!assinatura) return igual(segredo, secretDoCorpo);
  const quando = Number(timestamp) * 1000;
  if (!Number.isFinite(quando) || Math.abs(agora - quando) > TOLERANCIA_MS) return false;
  return hmacConfere(segredo, `${timestamp}.${corpo}`, assinatura.replace(/^v1=/, ""));
}

/** O que muda na assinatura com este aviso. Devolve null quando não muda nada. */
export function mudancaDoEvento(event, data, sub, agora = Date.now()) {
  const ligacao = {};
  const assinaturaId = idDaAssinatura(data);
  if (assinaturaId && assinaturaId !== sub.cakto_subscription_id) ligacao.cakto_subscription_id = assinaturaId;
  const soLigacao = Object.keys(ligacao).length ? ligacao : null;

  switch (event) {
    case "purchase_approved":
    case "subscription_renewed":
    case "subscription_late_recovered": {
      if (sub.status === "reembolsada") return soLigacao;
      const fim = agora + (sub.cycle === "anual" ? 366 : 31) * DAY;
      return {
        ...ligacao,
        status: "ativa",
        last_payment_id: data.id,
        current_period_end: iso(fim),
        access_until: iso(fim + GRACE_DAYS * DAY),
        ...(sub.paid_at ? {} : { paid_at: iso(agora), refundable_until: iso(agora + GUARANTEE_DAYS * DAY), first_payment_id: data.id }),
      };
    }
    case "refund":
    case "chargeback":
      if (sub.status === "reembolsada") return soLigacao;
      return { ...ligacao, status: "reembolsada", access_until: iso(agora), refunded_at: iso(agora), guarantee_used: true };
    case "subscription_canceled":
      if (["reembolsada", "cancelada"].includes(sub.status)) return soLigacao;
      return { ...ligacao, status: "cancelada", canceled_at: iso(agora) };
    default:
      return soLigacao;
  }
}
