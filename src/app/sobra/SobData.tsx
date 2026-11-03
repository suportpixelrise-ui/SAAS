"use client";

import { createContext, useContext, useEffect, useMemo, type ReactNode } from "react";
import { usePathname, useRouter } from "next/navigation";
import { fromRow, useTables } from "@/lib/db";
import { useSession } from "@/lib/session";
import { priceAlerts, type Ingredient, type Order, type PriceAlert, type Product, type SobraProfile } from "@/lib/sobra-core";
import { Loading, Notice } from "@/components/ui";

export interface SobState {
  uid: string; email: string | null; profile: SobraProfile | null;
  ingredients: Ingredient[]; ingMap: Map<string, Ingredient>; products: Product[]; orders: Order[]; alerts: PriceAlert[];
}

const Ctx = createContext<SobState | null>(null);
export function useSob(): SobState {
  const v = useContext(Ctx);
  if (!v) throw new Error("useSob fora do SobData");
  return v;
}

const TABLES = ["sob_profile", "sob_ingredients", "sob_products", "sob_orders"] as const;

export function SobData({ children }: { children: ReactNode }) {
  const { user } = useSession();
  const router = useRouter();
  const path = usePathname();
  const { raw, failed } = useTables(TABLES, user.uid);

  const state = useMemo<SobState | null>(() => {
    if (!raw) return null;
    const main = raw.sob_profile.find((d) => d.id === "main");
    const profile = main ? fromRow<SobraProfile>(main) : null;
    const ingredients = raw.sob_ingredients.map((d) => fromRow<Ingredient>(d)).sort((a, b) => a.name.localeCompare(b.name, "pt-BR"));
    const products = raw.sob_products.map((d) => fromRow<Product>(d)).sort((a, b) => a.name.localeCompare(b.name, "pt-BR"));
    const orders = raw.sob_orders.map((d) => fromRow<Order>(d));
    return { uid: user.uid, email: user.email, profile, ingredients, ingMap: new Map(ingredients.map((i) => [i.id, i])), products, orders, alerts: priceAlerts(ingredients, products) };
  }, [raw, user.uid, user.email]);

  const onSetup = path.startsWith("/sobra/comecar");
  useEffect(() => {
    if (state && !state.profile && !onSetup) router.replace("/sobra/comecar/");
  }, [state, onSetup, router]);

  if (failed) return <div className="app" data-app="sobra"><main className="content no-tabs"><Notice kind="bad">Não deu para carregar seus dados. Confira a internet ou a sua assinatura.</Notice></main></div>;
  if (!state || (!state.profile && !onSetup)) return <Loading app="sobra" />;
  return <Ctx.Provider value={state}>{children}</Ctx.Provider>;
}
