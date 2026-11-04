// O caminho de um aviso da Cakto até a assinatura. O banco e a API entram por `b`, para poder testar sem rede.

import { idDaAssinatura, mudancaDoEvento, normalizarEmail, pagamentoDuplicado, produtoDoAviso } from "./cakto-regras.js";

// Só quem pagou ganha conta. Aviso de assinatura criada, por exemplo, não prova pagamento.
const LIBERAM = new Set(["purchase_approved", "subscription_renewed", "subscription_late_recovered"]);

/** Compra sem o token do site: acha a conta pelo e-mail, ou cria uma. */
async function assinaturaPeloEmail(data, b) {
  const product = produtoDoAviso(data);
  const email = normalizarEmail(data.customer?.email);
  if (!product || !email) return null;
  const conta = (await b.acharConta(email)) ?? (await b.criarConta(email, product));
  return b.assinaturaDaConta(conta, product);
}

export async function tratarAviso(event, data, b) {
  let sub = await b.acharAssinatura(data);
  if (!sub && LIBERAM.has(event)) sub = await assinaturaPeloEmail(data, b);
  if (!sub) return "sem conta ligada";

  if (pagamentoDuplicado(event, data, sub)) {
    await b.devolver(data.id);
    await b.cancelar(idDaAssinatura(data));
    return "pagamento em dobro devolvido";
  }

  const patch = mudancaDoEvento(event, data, sub);
  if (!patch) return "ok";
  await b.atualizar(sub, patch);

  // Devolução feita fora do app: encerra a assinatura para não cobrar de novo no mês seguinte.
  const assinaturaId = patch.cakto_subscription_id ?? sub.cakto_subscription_id;
  if (patch.status === "reembolsada" && assinaturaId) await b.cancelar(assinaturaId);
  return "ok";
}
