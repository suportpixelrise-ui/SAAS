import { test } from "node:test";
import assert from "node:assert/strict";
import { tratarAviso } from "../supabase/functions/_shared/cakto-fluxo.js";

type Linha = Record<string, any>;

/** Banco de mentira, com as mesmas buscas do aviso real. */
function banco(contas: Record<string, string> = {}, linhas: Linha[] = []) {
  const db = { contas, linhas, convites: [] as string[], devolvidos: [] as string[], cancelados: [] as string[] };
  const b = {
    acharAssinatura: async (data: Linha) => linhas.find((l) => (data.callback && l.checkout_token === data.callback) || (data.subscription?.id && l.cakto_subscription_id === data.subscription.id)) ?? null,
    acharConta: async (email: string) => contas[email] ?? null,
    criarConta: async (email: string) => {
      db.convites.push(email);
      return (contas[email] = `uid-${email}`);
    },
    assinaturaDaConta: async (uid: string, product: string) => {
      let l = linhas.find((x) => x.user_id === uid && x.product === product);
      if (!l) linhas.push((l = { user_id: uid, product, status: "pendente", cycle: "mensal", paid_at: null, cakto_subscription_id: null, last_payment_id: null }));
      return l;
    },
    atualizar: async (sub: Linha, patch: Linha) => void Object.assign(sub, patch),
    devolver: async (id: string) => void db.devolvidos.push(id),
    cancelar: async (id: string) => void db.cancelados.push(id),
  };
  return { db, b };
}

const compra = (over: Linha = {}) => ({
  id: "pedido-1", offer: { id: "3a8bf5i" }, customer: { email: "  Maria@Email.COM " }, subscription: { id: "sub-1" }, ...over,
});

test("compra direta sem conta: cria a conta, ativa e convida uma vez só", async () => {
  const { db, b } = banco();
  assert.equal(await tratarAviso("purchase_approved", compra(), b), "ok");
  assert.deepEqual(db.convites, ["maria@email.com"]);
  assert.equal(db.linhas.length, 1);
  assert.equal(db.linhas[0].status, "ativa");
  assert.equal(db.linhas[0].first_payment_id, "pedido-1");
  const fim = db.linhas[0].access_until;

  await tratarAviso("purchase_approved", compra(), b);
  await tratarAviso("subscription_created", compra(), b);
  assert.deepEqual(db.convites, ["maria@email.com"]);
  assert.equal(db.linhas.length, 1);
  assert.equal(db.linhas[0].access_until, fim);
  assert.deepEqual(db.devolvidos, []);
});

test("compra direta com conta que já existe: só libera, sem convite", async () => {
  const { db, b } = banco({ "maria@email.com": "uid-1" });
  await tratarAviso("purchase_approved", compra(), b);
  assert.deepEqual(db.convites, []);
  assert.equal(db.linhas[0].user_id, "uid-1");
  assert.equal(db.linhas[0].status, "ativa");
});

test("compra pelo site, com o token: libera a conta do token mesmo com outro e-mail", async () => {
  const linha: Linha = { user_id: "uid-2", product: "cobranca", status: "pendente", cycle: "mensal", paid_at: null, checkout_token: "tok", cakto_subscription_id: null };
  const { db, b } = banco({ "ana@email.com": "uid-2" }, [linha]);
  await tratarAviso("purchase_approved", compra({ callback: "tok" }), b);
  assert.equal(linha.status, "ativa");
  assert.deepEqual(db.convites, []);
  assert.equal(db.linhas.length, 1);
});

test("pagou em dobro: devolve a segunda, cancela e mantém a primeira", async () => {
  const { db, b } = banco();
  await tratarAviso("purchase_approved", compra(), b);
  const segunda = compra({ id: "pedido-2", subscription: { id: "sub-2" } });
  assert.equal(await tratarAviso("purchase_approved", segunda, b), "pagamento em dobro devolvido");
  assert.deepEqual(db.devolvidos, ["pedido-2"]);
  assert.deepEqual(db.cancelados, ["sub-2"]);
  assert.equal(db.linhas[0].cakto_subscription_id, "sub-1");

  await tratarAviso("refund", segunda, b);
  assert.equal(db.linhas[0].status, "ativa");
});

test("não cria conta sem prova de pagamento, de outro produto ou sem e-mail válido", async () => {
  const { db, b } = banco();
  assert.equal(await tratarAviso("subscription_created", compra(), b), "sem conta ligada");
  assert.equal(await tratarAviso("purchase_approved", compra({ offer: { id: "outro" } }), b), "sem conta ligada");
  assert.equal(await tratarAviso("purchase_approved", compra({ customer: { email: "sem-arroba" } }), b), "sem conta ligada");
  assert.deepEqual(db.convites, []);
});

test("devolução feita no painel da Cakto corta o acesso e cancela", async () => {
  const { db, b } = banco();
  await tratarAviso("purchase_approved", compra(), b);
  await tratarAviso("refund", compra(), b);
  assert.equal(db.linhas[0].status, "reembolsada");
  assert.deepEqual(db.cancelados, ["sub-1"]);
});
