"use client";

import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import { fromRow } from "./db";
import { onRefresh, sb } from "./supabase";
import type { ProductId } from "./products";

export interface AppUser { uid: string; email: string | null }

export interface Subscription {
  product: ProductId; status: "pendente" | "ativa" | "cancelada" | "reembolsada";
  cycle: "mensal" | "anual"; priceCents: number; provider: string; guaranteeUsed: boolean; invoiceUrl: string | null;
  accessUntil: string | null; currentPeriodEnd: string | null; paidAt: string | null; refundableUntil: string | null;
}

const ms = (iso: string | null) => (iso ? Date.parse(iso) : 0);

export function hasAccess(sub: Subscription | null, now = Date.now()): boolean {
  return !!sub && ["ativa", "cancelada"].includes(sub.status) && ms(sub.accessUntil) > now;
}

export function canRefund(sub: Subscription | null, now = Date.now()): boolean {
  return !!sub && !!sub.paidAt && !sub.guaranteeUsed && sub.status !== "reembolsada" && ms(sub.refundableUntil) > now;
}

export function useUser() {
  const [state, setState] = useState<{ loading: boolean; user: AppUser | null; configured: boolean }>({ loading: true, user: null, configured: true });
  useEffect(() => {
    const client = sb();
    if (!client) return void setState({ loading: false, user: null, configured: false });
    const { data } = client.auth.onAuthStateChange((_event, session) => {
      const u = session?.user;
      setState({ loading: false, user: u ? { uid: u.id, email: u.email ?? null } : null, configured: true });
    });
    return () => data.subscription.unsubscribe();
  }, []);
  return state;
}

/** Acompanha a assinatura: muda sozinha quando o pagamento é confirmado. */
export function useSubscription(uid: string | undefined, product: ProductId) {
  const [state, setState] = useState<{ loading: boolean; sub: Subscription | null }>({ loading: true, sub: null });
  useEffect(() => {
    const client = sb();
    if (!client || !uid) return;
    let alive = true;
    const load = async () => {
      const { data } = await client.from("subscriptions").select("*").eq("user_id", uid).eq("product", product).maybeSingle();
      if (alive) setState({ loading: false, sub: data ? fromRow<Subscription>(data) : null });
    };
    void load();
    const off = onRefresh(load);
    const onFocus = () => void load();
    window.addEventListener("focus", onFocus);
    const channel = client
      .channel(`assinatura-${uid}-${product}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "subscriptions", filter: `user_id=eq.${uid}` }, () => void load())
      .subscribe();
    return () => {
      alive = false;
      off();
      window.removeEventListener("focus", onFocus);
      void client.removeChannel(channel);
    };
  }, [uid, product]);
  return state;
}

export interface Session { user: AppUser; sub: Subscription | null }
const SessionCtx = createContext<Session | null>(null);
export const SessionProvider = ({ value, children }: { value: Session; children: ReactNode }) => <SessionCtx.Provider value={value}>{children}</SessionCtx.Provider>;

export function useSession(): Session {
  const s = useContext(SessionCtx);
  if (!s) throw new Error("useSession fora do AccessGate");
  return s;
}
