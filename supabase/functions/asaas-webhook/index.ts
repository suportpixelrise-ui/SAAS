// Recebe os avisos do Asaas e libera ou corta o acesso.
// Quem chama é o Asaas, então não há login: o token no cabeçalho é a prova de que veio de lá.

import { timingSafeEqual } from "node:crypto";
import { admin, DAY, iso, json } from "../_shared/nucleo.ts";
import { GRACE_DAYS, GUARANTEE_DAYS } from "../_shared/plans.js";

const TOKEN = Deno.env.get("ASAAS_WEBHOOK_TOKEN") ?? "";

function tokenOk(given: string | null) {
  if (!TOKEN || !given) return false;
  const a = new TextEncoder().encode(TOKEN);
  const b = new TextEncoder().encode(given);
  return a.length === b.length && timingSafeEqual(a, b);
}

/** Período pago: libera o acesso até o fim dele, mais alguns dias de folga para o pagamento seguinte cair. */
function paidPeriod(cycle: string, now = Date.now()) {
  const end = now + (cycle === "anual" ? 366 : 31) * DAY;
  return { current_period_end: iso(end), access_until: iso(end + GRACE_DAYS * DAY) };
}

Deno.serve(async (req) => {
  if (req.method !== "POST") return json({ error: "use POST" }, 405);
  if (!tokenOk(req.headers.get("asaas-access-token"))) return json({ error: "não autorizado" }, 401);

  const event = await req.json().catch(() => ({}));
  const asaasSubId = event.payment?.subscription ?? event.subscription?.id;
  if (!asaasSubId) return json({ ok: true, ignorado: "sem assinatura" });

  const { data: sub, error } = await admin.from("subscriptions").select("*").eq("asaas_subscription_id", asaasSubId).maybeSingle();
  if (error) {
    console.error(error);
    return json({ error: "falha ao ler" }, 500);
  }
  if (!sub) return json({ ok: true, ignorado: "assinatura desconhecida" });

  const update = async (patch: Record<string, unknown>) => {
    const { error } = await admin.from("subscriptions").update(patch).eq("user_id", sub.user_id).eq("product", sub.product);
    if (error) throw error;
  };

  const now = Date.now();
  try {
    switch (event.event) {
      case "PAYMENT_CONFIRMED":
      case "PAYMENT_RECEIVED":
        if (sub.status === "reembolsada") break;
        await update({
          status: "ativa", last_payment_id: event.payment.id, ...paidPeriod(sub.cycle, now),
          ...(sub.paid_at ? {} : { paid_at: iso(now), refundable_until: iso(now + GUARANTEE_DAYS * DAY), first_payment_id: event.payment.id }),
        });
        break;
      case "PAYMENT_REFUNDED":
        await update({ status: "reembolsada", access_until: iso(now), refunded_at: iso(now), guarantee_used: true });
        break;
      case "SUBSCRIPTION_DELETED":
      case "SUBSCRIPTION_INACTIVATED":
        if (!["reembolsada", "cancelada"].includes(sub.status)) await update({ status: "cancelada", canceled_at: iso(now) });
        break;
    }
  } catch (err) {
    console.error(err);
    return json({ error: "falha ao gravar" }, 500);
  }
  return json({ ok: true });
});
