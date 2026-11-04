// Recebe os avisos da Cakto e libera ou corta o acesso.
// Quem chama é a Cakto, então não há login: a assinatura do aviso é a prova de que veio de lá.

import { admin, iso, json } from "../_shared/nucleo.ts";
import { cancelarAssinatura, devolverPedido, WEBHOOK_SECRET } from "../_shared/cakto.ts";
import { idDaAssinatura, origemValida, produtoDoAviso } from "../_shared/cakto-regras.js";
import { tratarAviso } from "../_shared/cakto-fluxo.js";
import { PLANS, priceFor } from "../_shared/plans.js";

type Produto = "cobranca" | "sobra";

async function acharAssinatura(data: Record<string, unknown>) {
  const pares: [string, unknown][] = [["checkout_token", data.callback], ["cakto_subscription_id", idDaAssinatura(data)], ["cakto_subscription_id", data.id]];
  for (const [coluna, valor] of pares) {
    if (typeof valor !== "string" || !valor) continue;
    const { data: sub, error } = await admin.from("subscriptions").select("*").eq(coluna, valor).maybeSingle();
    if (error) throw error;
    if (sub) return sub;
  }
  return null;
}

async function acharConta(email: string): Promise<string | null> {
  const { data, error } = await admin.rpc("conta_por_email", { p_email: email });
  if (error) throw error;
  return data;
}

/** O convite cria a conta e manda o e-mail de boas-vindas. Se o e-mail falhar, a conta sai assim mesmo: quem pagou não fica sem acesso. */
async function criarConta(email: string, product: Produto): Promise<string> {
  const { site, home } = PLANS[product];
  const redirectTo = new URL(`entrar/?nova=1&convite=1&volta=${encodeURIComponent(home!)}`, site).href;
  const convite = await admin.auth.admin.inviteUserByEmail(email, { redirectTo });
  if (convite.data?.user) return convite.data.user.id;

  // Dois avisos ao mesmo tempo: o outro já pode ter criado a conta.
  const existente = await acharConta(email);
  if (existente) return existente;
  console.error(JSON.stringify({ conviteFalhou: convite.error?.message ?? null, codigo: convite.error?.code ?? null }));
  const { data, error } = await admin.auth.admin.createUser({ email, email_confirm: true });
  if (data?.user) return data.user.id;
  const depois = await acharConta(email);
  if (depois) return depois;
  throw error;
}

async function assinaturaDaConta(uid: string, product: Produto) {
  const ler = () => admin.from("subscriptions").select("*").eq("user_id", uid).eq("product", product).maybeSingle();
  const { data: sub, error } = await ler();
  if (error) throw error;
  if (sub) return sub;
  const nova = { user_id: uid, product, status: "pendente", cycle: "mensal", price_cents: priceFor(uid, product, "mensal"), provider: "cakto", access_until: iso(0) };
  const gravou = await admin.from("subscriptions").upsert(nova, { onConflict: "user_id,product", ignoreDuplicates: true });
  if (gravou.error) throw gravou.error;
  const depois = await ler();
  if (depois.error) throw depois.error;
  return depois.data;
}

async function atualizar(sub: { user_id: string; product: string }, patch: Record<string, unknown>) {
  const { error } = await admin.from("subscriptions").update(patch).eq("user_id", sub.user_id).eq("product", sub.product);
  if (error) throw error;
}

const cancelar = (assinaturaId: string) =>
  cancelarAssinatura(assinaturaId).catch((err) => console.error("Falha ao cancelar na Cakto", err));

const devolver = (pedidoId: string) =>
  devolverPedido(pedidoId).catch((err) => console.error("Falha ao devolver o pagamento em dobro", err));

Deno.serve(async (req) => {
  if (req.method !== "POST") return json({ error: "use POST" }, 405);

  const corpo = await req.text();
  let aviso: { secret?: string; event?: string; data?: Record<string, unknown> };
  try {
    aviso = JSON.parse(corpo);
  } catch {
    return json({ error: "corpo inválido" }, 400);
  }
  const autorizado = await origemValida({
    segredo: WEBHOOK_SECRET,
    timestamp: req.headers.get("x-cakto-timestamp"),
    assinatura: req.headers.get("x-cakto-signature"),
    corpo,
    secretDoCorpo: aviso.secret,
  });
  if (!autorizado) {
    // Só tamanhos e formatos, nunca o valor: é o que mostra por que a senha não bateu.
    const ts = req.headers.get("x-cakto-timestamp");
    console.error(JSON.stringify({
      recusado: aviso.event ?? null, senhaCadastrada: WEBHOOK_SECRET.length, senhaRecebida: aviso.secret?.length ?? null,
      temAssinatura: req.headers.has("x-cakto-signature"), digitosTimestamp: ts?.length ?? null,
    }));
    return json({ error: "não autorizado" }, 401);
  }

  const event = aviso.event ?? "";
  const data = aviso.data ?? {};
  // Dado pessoal não vai para o log.
  console.log(JSON.stringify({ event, app: produtoDoAviso(data), temCallback: Boolean(data.callback) }));

  try {
    const resultado = await tratarAviso(event, data, { acharAssinatura, acharConta, criarConta, assinaturaDaConta, atualizar, devolver, cancelar });
    if (resultado !== "ok") console.error(JSON.stringify({ event, resultado, oferta: (data.offer as { id?: string } | undefined)?.id ?? null }));
    return json({ ok: true, resultado });
  } catch (err) {
    console.error(err);
    return json({ error: "falha ao gravar" }, 500);
  }
});
