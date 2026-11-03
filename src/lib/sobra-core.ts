// Regras do app Sobra, sem banco e sem tela.

import { addDays, today } from "./format.ts";
import { BASE_UNIT, costPerBase, hourCost, profit, suggestedPrice, unitCost, type CostBreakdown, type Unit } from "./sobra-calc.ts";
import type { SobraNiche } from "./sobra-templates.ts";

export interface SobraProfile {
  niche: SobraNiche; monthlyGoalCents: number; hoursPerWeek: number; hoursPerMonth: number;
  cylinderCents: number; cylinderHours: number; gasCostPerHourCents: number; defaultMarginPct: number;
}
export interface PricePoint { packageQty: number; packagePriceCents: number; at: string }
export interface Ingredient {
  id: string; name: string; unit: Unit; packageQty: number; packagePriceCents: number;
  previousPriceCents: number | null; previousPackageQty: number | null; priceChangedAt: string | null; alertSeen: boolean;
  history: PricePoint[]; createdAt: string;
}
export interface ProductItem { ingredientId: string; qty: number }
export interface Product {
  id: string; name: string; yieldUnits: number; packagingCents: number; gasMinutes: number; workMinutes: number;
  salePriceCents: number | null; marginPct: number | null; items: ProductItem[]; createdAt: string;
}
export interface OrderItem { productId: string | null; name: string; qty: number; unitPriceCents: number }
export interface Order {
  id: string; customerName: string; phone: string | null; deliveryDate: string; deliveryTime: string | null;
  totalCents: number; depositCents: number; status: "aberta" | "paga" | "entregue"; notes: string | null; items: OrderItem[]; createdAt: string;
}

export const profileHourCost = (p: SobraProfile) => hourCost(p.monthlyGoalCents, p.hoursPerMonth);
export const nowIso = () => new Date().toISOString();

export function newIngredient(id: string, name: string, unit: Unit, packageQty: number, priceCents: number): Ingredient {
  const at = nowIso();
  return {
    id, name: name.trim(), unit, packageQty, packagePriceCents: priceCents, previousPriceCents: null, previousPackageQty: null,
    priceChangedAt: null, alertSeen: true, history: [{ packageQty, packagePriceCents: priceCents, at }], createdAt: at,
  };
}

/**
 * O que muda num insumo quando o preço é atualizado. Se o preço por g, ml ou unidade subiu,
 * guarda o anterior e liga o alerta. A unidade base não muda (g continua g), para não estragar as receitas.
 */
export function ingredientUpdate(cur: Ingredient, name: string, unit: Unit, packageQty: number, priceCents: number): Partial<Ingredient> {
  const safeUnit = BASE_UNIT[unit] === BASE_UNIT[cur.unit] ? unit : cur.unit;
  const oldCost = costPerBase(cur.packagePriceCents, cur.packageQty, cur.unit);
  const newCost = costPerBase(priceCents, packageQty, safeUnit);
  const patch: Partial<Ingredient> = { name: name.trim(), unit: safeUnit, packageQty, packagePriceCents: priceCents };
  if (Math.abs(newCost - oldCost) > 1e-9) {
    const at = nowIso();
    Object.assign(patch, {
      previousPriceCents: cur.packagePriceCents, previousPackageQty: cur.packageQty, priceChangedAt: at, alertSeen: newCost <= oldCost,
      history: [{ packageQty, packagePriceCents: priceCents, at }, ...(cur.history ?? [])].slice(0, 12),
    });
  }
  return patch;
}

export interface PricedItem extends ProductItem { ingredient: Ingredient }
export interface PricedProduct extends Product { cost: CostBreakdown; priced: PricedItem[]; profit: number | null; profitPct: number | null; suggested: number; margin: number }

export function priceProduct(p: Product, ingredients: Map<string, Ingredient>, profile: SobraProfile, marginOverride?: number): PricedProduct {
  const priced = p.items.flatMap((it) => {
    const ingredient = ingredients.get(it.ingredientId);
    return ingredient ? [{ ...it, ingredient }] : [];
  });
  const cost = unitCost({
    items: priced.map((it) => ({ qty: it.qty, packagePriceCents: it.ingredient.packagePriceCents, packageQty: it.ingredient.packageQty, unit: it.ingredient.unit })),
    yieldUnits: p.yieldUnits,
    packagingCents: p.packagingCents,
    gasMinutes: p.gasMinutes,
    workMinutes: p.workMinutes,
    gasCostPerHourCents: profile.gasCostPerHourCents,
    hourCostCents: profileHourCost(profile),
  });
  const margin = marginOverride ?? p.marginPct ?? profile.defaultMarginPct;
  const pr = p.salePriceCents != null ? profit(p.salePriceCents, cost.total) : null;
  return { ...p, cost, priced, profit: pr ? pr.value : null, profitPct: pr ? pr.pctOfPrice : null, suggested: suggestedPrice(cost.total, margin), margin };
}

export interface PriceAlert { ingredient: Ingredient; risePct: number; products: { id: string; name: string; deltaPerUnit: number }[] }

/** Insumos que ficaram mais caros e ainda não foram vistos, com o efeito no lucro de cada produto que usa. */
export function priceAlerts(ingredients: Ingredient[], products: Product[]): PriceAlert[] {
  return ingredients
    .filter((i) => !i.alertSeen && i.previousPriceCents != null)
    .sort((a, b) => (b.priceChangedAt ?? "").localeCompare(a.priceChangedAt ?? ""))
    .map((ing) => {
      const oldC = costPerBase(ing.previousPriceCents!, ing.previousPackageQty ?? ing.packageQty, ing.unit);
      const newC = costPerBase(ing.packagePriceCents, ing.packageQty, ing.unit);
      return {
        ingredient: ing,
        risePct: oldC > 0 ? ((newC - oldC) / oldC) * 100 : 0,
        products: products.flatMap((p) => p.items.filter((it) => it.ingredientId === ing.id).map((it) => ({
          id: p.id, name: p.name, deltaPerUnit: -(it.qty * (newC - oldC)) / Math.max(1, p.yieldUnits),
        }))),
      };
    });
}

export const orderRest = (o: Order) => Math.max(0, o.totalCents - o.depositCents);

/** Encomendas não entregues até `days` dias à frente (inclui atrasadas), por data e hora. */
export function upcomingOrders(orders: Order[], days = 30, ref = today()): Order[] {
  const until = addDays(ref, days);
  return orders
    .filter((o) => o.status !== "entregue" && o.deliveryDate <= until)
    .sort((a, b) => a.deliveryDate.localeCompare(b.deliveryDate) || (a.deliveryTime ?? "99:99").localeCompare(b.deliveryTime ?? "99:99"));
}

export const deliveredOrders = (orders: Order[]) =>
  orders.filter((o) => o.status === "entregue").sort((a, b) => b.deliveryDate.localeCompare(a.deliveryDate)).slice(0, 30);
