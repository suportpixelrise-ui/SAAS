// Recebe os avisos da Cakto e libera ou corta o acesso.
// Quem chama é a Cakto, então não há login: a assinatura do aviso é a prova de que veio de lá.

import { admin, json } from "../_shared/nucleo.ts";
import { cancelarAssinatura, WEBHOOK_SECRET } from "../_shared/cakto.ts";
import { idDaAssinatura, mudancaDoEvento, origemValida } from "../_shared/cakto-regras.js";

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
  if (!autorizado) return json({ error: "não autorizado" }, 401);

  const event = aviso.event ?? "";
  const data = aviso.data ?? {};
  // Só os nomes dos campos: o formato de alguns avisos não está na documentação, e dado pessoal não vai para o log.
  console.log(JSON.stringify({ event, campos: Object.keys(data), assinatura: Object.keys((data.subscription as object) ?? {}), temCallback: Boolean(data.callback) }));

  try {
    const sub = await acharAssinatura(data);
    if (!sub) {
      console.error(`Aviso ${event} sem conta ligada`);
      return json({ ok: true, ignorado: "assinatura desconhecida" });
    }
    const patch = mudancaDoEvento(event, data, sub);
    if (!patch) return json({ ok: true });
    const { error } = await admin.from("subscriptions").update(patch).eq("user_id", sub.user_id).eq("product", sub.product);
    if (error) throw error;

    // Devolução feita fora do app: encerra a assinatura para não cobrar de novo no mês seguinte.
    const assinaturaId = (patch.cakto_subscription_id ?? sub.cakto_subscription_id) as string | null;
    if (patch.status === "reembolsada" && assinaturaId) {
      await cancelarAssinatura(assinaturaId).catch((err) => console.error("Falha ao cancelar depois da devolução", err));
    }
  } catch (err) {
    console.error(err);
    return json({ error: "falha ao gravar" }, 500);
  }
  return json({ ok: true });
});
