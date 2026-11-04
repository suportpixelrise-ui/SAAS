// Chamadas à API da Cakto. As chaves ficam só nos segredos das Edge Functions.

import { Aviso } from "./nucleo.ts";

const BASE = "https://api.cakto.com.br/public_api";
const CLIENT_ID = (Deno.env.get("CAKTO_CLIENT_ID") ?? "").trim();
const CLIENT_SECRET = (Deno.env.get("CAKTO_CLIENT_SECRET") ?? "").trim();

export const WEBHOOK_SECRET = (Deno.env.get("CAKTO_WEBHOOK_SECRET") ?? "").trim();

/** Só vende quando dá para receber o aviso: sem ele, a pessoa pagaria e o app não abriria. */
export const caktoPronta = Boolean(CLIENT_ID && CLIENT_SECRET && WEBHOOK_SECRET);

async function pedir(path: string, init: RequestInit) {
  const res = await fetch(`${BASE}${path}`, init);
  const body = await res.json().catch(() => ({}));
  if (!res.ok) {
    // Só o caminho sem ids, o erro e os tamanhos das chaves: nunca o valor delas.
    console.error(JSON.stringify({ cakto: path.split("/")[1], status: res.status, erro: body?.error ?? body?.detail ?? null, tamanhoId: CLIENT_ID.length, tamanhoSecret: CLIENT_SECRET.length }));
    throw new Aviso(body?.detail || `A Cakto respondeu ${res.status}`, 502);
  }
  return body;
}

async function post(path: string) {
  const { access_token } = await pedir("/token/", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({ client_id: CLIENT_ID, client_secret: CLIENT_SECRET }),
  });
  return pedir(path, { method: "POST", headers: { Authorization: `Bearer ${access_token}` } });
}

export const devolverPedido = (pedidoId: string) => post(`/orders/${pedidoId}/refund/`);
export const cancelarAssinatura = (assinaturaId: string) => post(`/subscriptions/${assinaturaId}/cancel/`);
