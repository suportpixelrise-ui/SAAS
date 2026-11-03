// Tudo o que a pessoa pede sobre a própria assinatura. O campo "acao" diz o quê:
// - criar: cria o cliente e a assinatura no Asaas e devolve o link de pagamento.
// - reembolso: garantia de 7 dias, devolve o primeiro pagamento e encerra a assinatura.
// - cancelar: para as próximas cobranças; o acesso vai até o fim do período pago.
// Sem chave do Asaas e com payment_settings.simulado ligado, o pagamento e o reembolso são simulados.

import { admin, Aviso, CORS, DAY, iso, json } from "../_shared/nucleo.ts";
import { GRACE_DAYS, GUARANTEE_DAYS, PLANS, priceFor } from "../_shared/plans.js";

const ASAAS_API_KEY = Deno.env.get("ASAAS_API_KEY") ?? "";
const ASAAS_API_URL = Deno.env.get("ASAAS_API_URL") || "https://api-sandbox.asaas.com/v3";

type Body = { acao?: string; product?: string; cycle?: string; name?: string; cpfCnpj?: string };
type Who = { uid: string; email: string | undefined };

async function modo() {
  if (ASAAS_API_KEY) return "asaas";
  const { data } = await admin.from("payment_settings").select("simulado").maybeSingle();
  return data?.simulado ? "simulado" : "desligado";
}

async function asaas(path: string, init: RequestInit = {}) {
  const res = await fetch(`${ASAAS_API_URL}${path}`, {
    ...init,
    headers: { access_token: ASAAS_API_KEY, "Content-Type": "application/json", "User-Agent": "plataforma-saas", ...(init.headers ?? {}) },
  });
  const body = await res.json().catch(() => ({}));
  if (!res.ok) throw new Aviso(body?.errors?.[0]?.description || `Asaas respondeu ${res.status}`, 502);
  return body;
}

async function quemChamou(req: Request): Promise<Who> {
  const token = req.headers.get("Authorization")?.replace("Bearer ", "") ?? "";
  const { data } = await admin.auth.getUser(token);
  if (!data.user) throw new Aviso("Entre na sua conta primeiro.", 401);
  return { uid: data.user.id, email: data.user.email };
}

async function lerAssinatura(uid: string, product: string) {
  const { data, error } = await admin.from("subscriptions").select("*").eq("user_id", uid).eq("product", product).maybeSingle();
  if (error) throw error;
  return data;
}

async function gravar(row: Record<string, unknown>) {
  const { error } = await admin.from("subscriptions").upsert(row, { onConflict: "user_id,product" });
  if (error) throw error;
}

async function mudar(uid: string, product: string, patch: Record<string, unknown>) {
  const { error } = await admin.from("subscriptions").update(patch).eq("user_id", uid).eq("product", product);
  if (error) throw error;
}

async function criar(who: Who, product: string, body: Body) {
  const { uid } = who;
  const cycle = body.cycle === "anual" && PLANS[product].yearly ? "anual" : "mensal";
  const current = await lerAssinatura(uid, product);
  if (current && ["ativa", "cancelada"].includes(current.status) && Date.parse(current.access_until) > Date.now()) {
    throw new Aviso("Sua assinatura já está ativa.");
  }
  // A garantia vale uma vez por pessoa e por app: quem já pediu reembolso não ganha outra ao assinar de novo.
  const base = {
    user_id: uid, product, cycle, price_cents: priceFor(uid, product, cycle),
    guarantee_used: Boolean(current?.guarantee_used || current?.refunded_at),
    refunded_at: null, canceled_at: null,
  };

  const m = await modo();
  if (m === "desligado") throw new Aviso("O pagamento ainda não está configurado.");

  if (m === "simulado") {
    const now = Date.now();
    const end = now + (cycle === "anual" ? 366 : 31) * DAY;
    await gravar({
      ...base, status: "ativa", provider: "simulado", asaas_subscription_id: null, invoice_url: null, last_payment_id: "simulado",
      current_period_end: iso(end), access_until: iso(end + GRACE_DAYS * DAY),
      paid_at: iso(now), refundable_until: iso(now + GUARANTEE_DAYS * DAY), first_payment_id: "simulado",
    });
    return { simulated: true };
  }

  const name = String(body.name ?? "").trim();
  const doc = String(body.cpfCnpj ?? "").replace(/\D/g, "");
  if (name.length < 3) throw new Aviso("Digite seu nome completo.");
  if (doc.length !== 11 && doc.length !== 14) throw new Aviso("Digite um CPF (11 números) ou CNPJ (14 números).");

  const { data: billing } = await admin.from("billing").select("asaas_customer_id").eq("user_id", uid).maybeSingle();
  let customerId = billing?.asaas_customer_id;
  if (!customerId) {
    const customer = await asaas("/customers", {
      method: "POST",
      body: JSON.stringify({ name, cpfCnpj: doc, email: who.email, externalReference: uid }),
    });
    customerId = customer.id;
    const { error } = await admin.from("billing").upsert({ user_id: uid, asaas_customer_id: customerId });
    if (error) throw error;
  }

  const created = await asaas("/subscriptions", {
    method: "POST",
    body: JSON.stringify({
      customer: customerId,
      billingType: "UNDEFINED",
      value: base.price_cents / 100,
      nextDueDate: new Date().toISOString().slice(0, 10),
      cycle: cycle === "anual" ? "YEARLY" : "MONTHLY",
      description: `Assinatura ${PLANS[product].name} (${cycle})`,
      externalReference: `${uid}_${product}`,
    }),
  });
  const payments = await asaas(`/subscriptions/${created.id}/payments`);
  const url = payments?.data?.[0]?.invoiceUrl;
  if (!url) throw new Aviso("O Asaas não devolveu o link de pagamento.", 502);
  await gravar({
    ...base, status: "pendente", provider: "asaas", asaas_subscription_id: created.id, invoice_url: url,
    access_until: iso(0), current_period_end: null, paid_at: null, refundable_until: null, first_payment_id: null, last_payment_id: null,
  });
  return { url };
}

async function reembolso({ uid }: Who, product: string) {
  const sub = await lerAssinatura(uid, product);
  if (!sub?.paid_at || !sub.first_payment_id) throw new Aviso("Não encontramos um pagamento para devolver.");
  if (sub.status === "reembolsada") throw new Aviso("Esse pagamento já foi devolvido.");
  if (sub.guarantee_used) throw new Aviso("A garantia vale só para a primeira assinatura.");
  if (Date.parse(sub.refundable_until) < Date.now()) throw new Aviso(`O prazo de ${GUARANTEE_DAYS} dias da garantia já passou.`);

  const m = await modo();
  if (sub.provider === "asaas") {
    if (m !== "asaas") throw new Aviso("O pagamento não está configurado.");
    await asaas(`/payments/${sub.first_payment_id}/refund`, { method: "POST", body: JSON.stringify({ description: "Garantia de 7 dias" }) });
    await asaas(`/subscriptions/${sub.asaas_subscription_id}`, { method: "DELETE" }).catch(() => null);
  } else if (m !== "simulado") {
    throw new Aviso("Assinatura simulada só existe com o modo de teste ligado.");
  }
  const now = iso(Date.now());
  await mudar(uid, product, { status: "reembolsada", access_until: now, refunded_at: now, guarantee_used: true });
  return { ok: true };
}

async function cancelar({ uid }: Who, product: string) {
  const sub = await lerAssinatura(uid, product);
  if (!sub || !["ativa", "pendente"].includes(sub.status)) throw new Aviso("Não há assinatura ativa.");
  if (sub.provider === "asaas" && sub.asaas_subscription_id && (await modo()) === "asaas") {
    await asaas(`/subscriptions/${sub.asaas_subscription_id}`, { method: "DELETE" });
  }
  await mudar(uid, product, { status: "cancelada", canceled_at: iso(Date.now()) });
  return { ok: true };
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: CORS });
  if (req.method !== "POST") return json({ error: "use POST" }, 405);
  try {
    const who = await quemChamou(req);
    const body: Body = await req.json().catch(() => ({}));
    const product = body.product ?? "";
    if (!PLANS[product]) throw new Aviso("App inválido.");
    if (body.acao === "criar") return json(await criar(who, product, body));
    if (body.acao === "reembolso") return json(await reembolso(who, product));
    if (body.acao === "cancelar") return json(await cancelar(who, product));
    throw new Aviso("Pedido inválido.");
  } catch (err) {
    if (err instanceof Aviso) return json({ error: err.message }, err.status);
    console.error(err);
    return json({ error: "Algo deu errado. Tente de novo." }, 500);
  }
});
