import { test } from "node:test";
import assert from "node:assert/strict";
import { createHmac } from "node:crypto";
import { idDaAssinatura, mudancaDoEvento, normalizarEmail, origemValida, pagamentoDuplicado, produtoDoAviso } from "../supabase/functions/_shared/cakto-regras.js";

const AGORA = Date.parse("2026-11-04T12:00:00Z");
const DIA = 86400_000;
const pendente = { status: "pendente", cycle: "mensal", paid_at: null, cakto_subscription_id: null };
const ativa = { status: "ativa", cycle: "mensal", paid_at: "2026-10-04T12:00:00.000Z", cakto_subscription_id: "sub-1", last_payment_id: "pedido-1", access_until: "2026-11-30T12:00:00.000Z" };

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

test("segredo certo no corpo vale mesmo se a assinatura do cabeçalho não bater", async () => {
  assert.equal(await origemValida({ segredo: "segredo", timestamp: "1", assinatura: "v1=abc", corpo: "{}", secretDoCorpo: "segredo" }), true);
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

test("aviso repetido do mesmo pedido não estende o acesso", () => {
  assert.equal(mudancaDoEvento("purchase_approved", { id: "pedido-1", subscription: { id: "sub-1" } }, ativa, AGORA), null);
});

test("limpa o e-mail da compra e recusa o que não é e-mail", () => {
  assert.equal(normalizarEmail("  Maria.Silva@Email.COM "), "maria.silva@email.com");
  for (const ruim of ["", "maria", "maria@", "a b@c.com", null, undefined, 10]) assert.equal(normalizarEmail(ruim), null);
});

test("reconhece o app pela oferta e ignora outros produtos da mesma conta Cakto", () => {
  assert.equal(produtoDoAviso({ offer: { id: "3a8bf5i" } }), "cobranca");
  assert.equal(produtoDoAviso({ offer: { id: "3a8bf5i_1280313" } }), "cobranca");
  assert.equal(produtoDoAviso({ offer: { id: "x" }, checkoutUrl: "https://pay.cakto.com.br/3a8bf5i_1280313?callback=abc" }), "cobranca");
  assert.equal(produtoDoAviso({ offer: { id: "outra" }, checkoutUrl: "https://pay.cakto.com.br/outra" }), null);
  assert.equal(produtoDoAviso({}), null);
});

test("segunda assinatura paga com a primeira ativa é pagamento em dobro", () => {
  const dobro = { id: "pedido-9", subscription: { id: "sub-2" } };
  assert.equal(pagamentoDuplicado("purchase_approved", dobro, ativa, AGORA), true);
  assert.equal(pagamentoDuplicado("purchase_approved", { id: "pedido-2", subscription: { id: "sub-1" } }, ativa, AGORA), false);
  assert.equal(pagamentoDuplicado("subscription_renewed", dobro, ativa, AGORA), false);
  assert.equal(pagamentoDuplicado("purchase_approved", dobro, { ...ativa, status: "cancelada" }, AGORA), false);
  assert.equal(pagamentoDuplicado("purchase_approved", dobro, { ...ativa, access_until: "2026-11-01T12:00:00.000Z" }, AGORA), false);
  assert.equal(pagamentoDuplicado("purchase_approved", dobro, pendente, AGORA), false);
});

test("devolução da assinatura em dobro não corta a que vale", () => {
  const dobro = { id: "pedido-9", subscription: { id: "sub-2" } };
  for (const event of ["refund", "chargeback", "subscription_canceled", "subscription_created"]) assert.equal(mudancaDoEvento(event, dobro, ativa, AGORA), null);
});

test("quem foi reembolsado e compra de novo volta a ter acesso, sem nova garantia", () => {
  const antes = { ...ativa, status: "reembolsada", guarantee_used: true, refunded_at: "2026-10-05T12:00:00.000Z", provider: "simulado" };
  const p = mudancaDoEvento("purchase_approved", { id: "pedido-5", subscription: { id: "sub-5" } }, antes, AGORA)!;
  assert.equal(p.status, "ativa");
  assert.equal(p.provider, "cakto");
  assert.equal(p.refunded_at, null);
  assert.equal(p.cakto_subscription_id, "sub-5");
  assert.equal(p.first_payment_id, "pedido-5");
  assert.equal(p.guarantee_used, undefined);
});
