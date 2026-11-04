import { test } from "node:test";
import assert from "node:assert/strict";
import { createHmac } from "node:crypto";
import { idDaAssinatura, mudancaDoEvento, origemValida } from "../supabase/functions/_shared/cakto-regras.js";

const AGORA = Date.parse("2026-11-04T12:00:00Z");
const DIA = 86400_000;
const pendente = { status: "pendente", cycle: "mensal", paid_at: null, cakto_subscription_id: null };
const ativa = { status: "ativa", cycle: "mensal", paid_at: "2026-10-04T12:00:00.000Z", cakto_subscription_id: "sub-1" };

function assinar(corpo: string, ts: number, segredo = "segredo") {
  return `v1=${createHmac("sha256", segredo).update(`${ts}.${corpo}`).digest("hex")}`;
}

test("aceita o aviso com assinatura certa e recusa os outros", async () => {
  const ts = AGORA / 1000;
  const corpo = '{"event":"refund"}';
  const base = { segredo: "segredo", timestamp: String(ts), corpo, agora: AGORA };
  assert.equal(await origemValida({ ...base, assinatura: assinar(corpo, ts) }), true);
  assert.equal(await origemValida({ ...base, assinatura: assinar(corpo, ts, "outro") }), false);
  assert.equal(await origemValida({ ...base, assinatura: assinar(corpo, ts), corpo: '{"event":"purchase_approved"}' }), false);
  assert.equal(await origemValida({ ...base, assinatura: "v1=abc" }), false);
});

test("recusa aviso velho, mesmo com assinatura certa", async () => {
  const ts = AGORA / 1000 - 600;
  const corpo = "{}";
  assert.equal(await origemValida({ segredo: "segredo", timestamp: String(ts), assinatura: assinar(corpo, ts), corpo, agora: AGORA }), false);
});

test("sem assinatura no cabeçalho, vale só o segredo certo no corpo", async () => {
  const base = { segredo: "segredo", timestamp: null, assinatura: null, corpo: "{}" };
  assert.equal(await origemValida({ ...base, secretDoCorpo: "segredo" }), true);
  assert.equal(await origemValida({ ...base, secretDoCorpo: "errado" }), false);
  assert.equal(await origemValida({ ...base }), false);
  assert.equal(await origemValida({ ...base, segredo: "", secretDoCorpo: "" }), false);
});

test("lê o id da assinatura nos dois formatos", () => {
  assert.equal(idDaAssinatura({ subscription: { id: "a" } }), "a");
  assert.equal(idDaAssinatura({ subscription: "b" }), "b");
  assert.equal(idDaAssinatura({ subscription: null }), null);
});

test("primeira compra libera o acesso e abre a garantia", () => {
  const p = mudancaDoEvento("purchase_approved", { id: "pedido-1", subscription: { id: "sub-1" } }, pendente, AGORA)!;
  assert.equal(p.status, "ativa");
  assert.equal(p.first_payment_id, "pedido-1");
  assert.equal(p.cakto_subscription_id, "sub-1");
  assert.equal(p.refundable_until, new Date(AGORA + 7 * DIA).toISOString());
  assert.equal(p.access_until, new Date(AGORA + 34 * DIA).toISOString());
});

test("renovação estende o acesso sem reabrir a garantia", () => {
  const p = mudancaDoEvento("subscription_renewed", { id: "pedido-2", subscription: { id: "sub-1" } }, ativa, AGORA)!;
  assert.equal(p.last_payment_id, "pedido-2");
  assert.equal(p.first_payment_id, undefined);
  assert.equal(p.refundable_until, undefined);
  assert.equal(p.access_until, new Date(AGORA + 34 * DIA).toISOString());
});

test("aviso de assinatura criada só guarda o id, não libera nada", () => {
  assert.deepEqual(mudancaDoEvento("subscription_created", { id: "x", subscription: { id: "sub-1" } }, pendente, AGORA), { cakto_subscription_id: "sub-1" });
});

test("devolução e contestação cortam o acesso e gastam a garantia", () => {
  for (const event of ["refund", "chargeback"]) {
    const p = mudancaDoEvento(event, { id: "pedido-1" }, ativa, AGORA)!;
    assert.equal(p.status, "reembolsada");
    assert.equal(p.guarantee_used, true);
    assert.equal(p.access_until, new Date(AGORA).toISOString());
  }
});

test("pagamento atrasado não reativa quem foi reembolsado", () => {
  assert.equal(mudancaDoEvento("purchase_approved", { id: "p", subscription: { id: "sub-1" } }, { ...ativa, status: "reembolsada" }, AGORA), null);
});

test("cancelamento mantém o acesso até o fim do período pago", () => {
  const p = mudancaDoEvento("subscription_canceled", { subscription: { id: "sub-1" } }, ativa, AGORA)!;
  assert.equal(p.status, "cancelada");
  assert.equal(p.access_until, undefined);
  assert.equal(mudancaDoEvento("subscription_canceled", { subscription: { id: "sub-1" } }, { ...ativa, status: "reembolsada" }, AGORA), null);
});

test("cobrança recusada não muda nada: a folga de dias cuida disso", () => {
  assert.equal(mudancaDoEvento("subscription_renewal_refused", { subscription: { id: "sub-1" } }, ativa, AGORA), null);
});
