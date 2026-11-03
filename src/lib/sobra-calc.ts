// Contas do Sobra, sem acesso ao banco (dá para testar sozinhas).
// Dinheiro em centavos. Quantidades da receita sempre na unidade base do insumo: g, ml ou unidade.

export type Unit = "g" | "kg" | "ml" | "l" | "un";
export const UNITS: Unit[] = ["g", "kg", "ml", "l", "un"];
export const BASE_UNIT: Record<Unit, "g" | "ml" | "un"> = { g: "g", kg: "g", ml: "ml", l: "ml", un: "un" };
const FACTOR: Record<Unit, number> = { g: 1, kg: 1000, ml: 1, l: 1000, un: 1 };

/** Preço de 1 g, 1 ml ou 1 unidade, em centavos (com fração). */
export function costPerBase(packagePriceCents: number, packageQty: number, unit: Unit): number {
  const base = packageQty * FACTOR[unit];
  return base > 0 ? packagePriceCents / base : 0;
}

export interface CostInput {
  items: { qty: number; packagePriceCents: number; packageQty: number; unit: Unit }[];
  yieldUnits: number;
  packagingCents: number;   // por unidade
  gasMinutes: number;       // da receita inteira
  workMinutes: number;      // da receita inteira
  gasCostPerHourCents: number;
  hourCostCents: number;
}

export interface CostBreakdown { ingredients: number; packaging: number; gas: number; work: number; total: number }

/** Custo de UMA unidade, com cada parte separada. */
export function unitCost(i: CostInput): CostBreakdown {
  const y = Math.max(1, i.yieldUnits);
  const ingredients = i.items.reduce((s, it) => s + it.qty * costPerBase(it.packagePriceCents, it.packageQty, it.unit), 0) / y;
  const packaging = i.packagingCents;
  const gas = ((i.gasMinutes / 60) * i.gasCostPerHourCents) / y;
  const work = ((i.workMinutes / 60) * i.hourCostCents) / y;
  return { ingredients, packaging, gas, work, total: ingredients + packaging + gas + work };
}

/** Valor da hora de trabalho: quanto quer tirar por mês dividido pelas horas trabalhadas no mês. */
export function hourCost(monthlyGoalCents: number, hoursPerMonth: number): number {
  return hoursPerMonth > 0 ? monthlyGoalCents / hoursPerMonth : 0;
}

/** Custo do gás por hora: preço do botijão dividido pelas horas que ele dura. */
export function gasPerHour(cylinderCents: number, cylinderHours: number): number {
  return cylinderHours > 0 ? Math.round(cylinderCents / cylinderHours) : 0;
}

/** Preço sugerido: custo + a margem escolhida, arredondado para cima nos 10 centavos. */
export function suggestedPrice(totalCostCents: number, marginPct: number): number {
  const raw = totalCostCents * (1 + marginPct / 100);
  return Math.ceil(raw / 10 - 1e-9) * 10;
}

export function profit(priceCents: number, totalCostCents: number) {
  const value = priceCents - totalCostCents;
  return { value, pctOfPrice: priceCents > 0 ? (value / priceCents) * 100 : 0 };
}

/** Quanto o lucro por unidade muda quando o preço de um insumo muda. */
export function profitDeltaPerUnit(qty: number, yieldUnits: number, oldCostPerBase: number, newCostPerBase: number): number {
  return -(qty * (newCostPerBase - oldCostPerBase)) / Math.max(1, yieldUnits);
}
