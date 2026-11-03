// O que as duas Edge Functions usam: o acesso de servidor ao banco e as respostas.

import { createClient } from "npm:@supabase/supabase-js@2.118.0";

function secretKey(): string {
  const keys = Deno.env.get("SUPABASE_SECRET_KEYS");
  return keys ? JSON.parse(keys).default : Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
}

/** Acesso de servidor: passa por cima das regras do banco. Nunca sai daqui para o navegador. */
export const admin = createClient(Deno.env.get("SUPABASE_URL")!, secretKey(), {
  auth: { persistSession: false, autoRefreshToken: false },
});

export const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

export const json = (body: unknown, status = 200) =>
  Response.json(body, { status, headers: CORS });

/** Erro com texto para mostrar na tela. */
export class Aviso extends Error {
  constructor(message: string, public status = 400) {
    super(message);
  }
}

export const DAY = 86400_000;
export const iso = (ms: number) => new Date(ms).toISOString();
