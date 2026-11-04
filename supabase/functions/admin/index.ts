// Lista de assinantes para a tela de administrador. Só responde para quem está na tabela admins.
// Mostra apenas dados da assinatura, nunca os clientes, produtos ou encomendas de cada pessoa.

import { admin, Aviso, CORS, json } from "../_shared/nucleo.ts";

async function exigirAdmin(req: Request) {
  const token = req.headers.get("Authorization")?.replace("Bearer ", "") ?? "";
  const { data } = await admin.auth.getUser(token);
  if (!data.user) throw new Aviso("Entre na sua conta primeiro.", 401);
  const { data: row } = await admin.from("admins").select("user_id").eq("user_id", data.user.id).maybeSingle();
  if (!row) throw new Aviso("Esta área é só para o administrador.", 403);
}

async function emails() {
  const map = new Map<string, string>();
  for (let page = 1; ; page++) {
    const { data, error } = await admin.auth.admin.listUsers({ page, perPage: 1000 });
    if (error) throw error;
    for (const u of data.users) map.set(u.id, u.email ?? "");
    if (data.users.length < 1000) return { map, total: map.size };
  }
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: CORS });
  if (req.method !== "POST") return json({ error: "use POST" }, 405);
  try {
    await exigirAdmin(req);
    const { map, total } = await emails();
    const { data, error } = await admin.from("subscriptions")
      .select("user_id, product, status, cycle, price_cents, provider, created_at, paid_at, current_period_end, access_until, canceled_at, refunded_at")
      .order("created_at", { ascending: false });
    if (error) throw error;
    return json({ contas: total, assinaturas: data.map(({ user_id, ...s }) => ({ ...s, email: map.get(user_id) ?? "" })) });
  } catch (err) {
    if (err instanceof Aviso) return json({ error: err.message }, err.status);
    console.error(err);
    return json({ error: "Algo deu errado. Tente de novo." }, 500);
  }
});
