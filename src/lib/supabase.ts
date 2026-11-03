"use client";

import { createClient, FunctionsHttpError, type SupabaseClient } from "@supabase/supabase-js";

// O endereço e a chave pública vêm do config.js. Se ele estiver vazio, usa as variáveis NEXT_PUBLIC_SUPABASE_*.
// Essa chave pode ficar visível no site: quem protege os dados são as regras do banco.

interface AppConfig {
  supabase: { url: string; publishableKey: string };
  pagamentoSimulado?: boolean;
}

declare global {
  interface Window { APP_CONFIG?: AppConfig }
}

function readConfig(): AppConfig["supabase"] | null {
  const fromFile = typeof window !== "undefined" ? window.APP_CONFIG?.supabase : undefined;
  if (fromFile?.url && !fromFile.url.startsWith("COLE_")) return fromFile;
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";
  const publishableKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ?? "";
  return url && publishableKey ? { url, publishableKey } : null;
}

let client: SupabaseClient | null | undefined;

/** null quando o config.js ainda não foi preenchido. */
export function sb(): SupabaseClient | null {
  if (client !== undefined) return client;
  const cfg = readConfig();
  return (client = cfg ? createClient(cfg.url, cfg.publishableKey) : null);
}

/** Avisos de "os dados mudaram": a tela recarrega antes de a gravação terminar, como se fosse na hora. */
const reloaders = new Set<() => Promise<void>>();

export function onRefresh(fn: () => Promise<void>) {
  reloaders.add(fn);
  return () => void reloaders.delete(fn);
}

export const refresh = async () => void (await Promise.all([...reloaders].map((fn) => fn())));

export async function call<O>(name: string, body: Record<string, unknown>): Promise<O> {
  const client = sb();
  if (!client) throw new Error("O Supabase não está configurado.");
  const { data, error } = await client.functions.invoke<O>(name, { body });
  if (error) {
    if (error instanceof FunctionsHttpError) {
      const sent = await error.context.json().catch(() => null);
      if (sent?.error) throw new Error(sent.error);
    }
    throw error;
  }
  await refresh();
  return data as O;
}

/** Mensagem amigável para erros do Supabase e das Edge Functions. */
export function errorText(err: unknown): string {
  const e = err as { code?: string; message?: string; status?: number };
  const code = e?.code ?? "";
  const message = e?.message ?? "";
  if (code === "42501") return message.startsWith("new row") || message.startsWith("permission") ? "Sem permissão. Confira se a sua assinatura está ativa." : message;
  if (code === "over_email_send_rate_limit" || e?.status === 429) return "Muitos pedidos seguidos. Espere um minuto e tente de novo.";
  if (code === "validation_failed" || code === "email_address_invalid") return "Confira o e-mail. Ele parece incompleto.";
  if (message.includes("Failed to fetch") || message.includes("Failed to send")) return "Sem conexão. Confira a internet e tente de novo.";
  return message || "Algo deu errado. Tente de novo.";
}
