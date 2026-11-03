import { test } from "node:test";
import assert from "node:assert/strict";
import { ingredientUpdate, newIngredient, priceAlerts, priceProduct, upcomingOrders, type Order, type Product, type SobraProfile } from "../src/lib/sobra-core.ts";

const profile: SobraProfile = { niche: "doces", monthlyGoalCents: 260000, hoursPerWeek: 30, hoursPerMonth: 130, cylinderCents: 12000, cylinderHours: 50, gasCostPerHourCents: 240, defaultMarginPct: 50 };
const leite = newIngredient("i1", "Leite condensado", "g", 395, 749);
const brigadeiro: Product = { id: "p1", name: "Brigadeiro", yieldUnits: 30, packagingCents: 12, gasMinutes: 20, workMinutes: 60, salePriceCents: 250, marginPct: null, items: [{ ingredientId: "i1", qty: 395 }], createdAt: "" };

test("custo, lucro e preço sugerido do brigadeiro", () => {
  const p = priceProduct(brigadeiro, new Map([["i1", leite]]), profile);
  assert.equal(Math.round(p.cost.ingredients), 25); // 7,49 / 30
  assert.equal(Math.round(p.cost.work), 67);        // 1 h a R$ 20,00 / 30
  assert.equal(p.margin, 50);
  assert.ok(p.profit! > 0);
});

test("preço do insumo subiu: alerta e efeito no lucro", () => {
  const patch = ingredientUpdate(leite, leite.name, "g", 395, 839);
  assert.equal(patch.alertSeen, false);
  assert.equal(patch.previousPriceCents, 749);
  const updated = { ...leite, ...patch };
  const [a] = priceAlerts([updated], [brigadeiro]);
  assert.equal(Math.round(a.risePct), 12);
  assert.equal(Math.round(-a.products[0].deltaPerUnit), 3);
});

test("preço do insumo baixou: sem alerta", () => {
  const patch = ingredientUpdate(leite, leite.name, "g", 395, 699);
  assert.equal(patch.alertSeen, true);
  assert.equal(priceAlerts([{ ...leite, ...patch }], [brigadeiro]).length, 0);
});

test("unidade não troca de tipo (g não vira ml)", () => {
  assert.equal(ingredientUpdate(leite, leite.name, "ml", 395, 749).unit, "g");
  assert.equal(ingredientUpdate(leite, leite.name, "kg", 1, 2000).unit, "kg");
});

test("encomendas: atrasadas e da semana, em ordem; entregues saem", () => {
  const o = (id: string, d: string, status: Order["status"] = "aberta"): Order => ({ id, customerName: id, phone: null, deliveryDate: d, deliveryTime: null, totalCents: 100, depositCents: 0, status, notes: null, items: [], createdAt: "" });
  const list = upcomingOrders([o("b", "2026-11-05"), o("a", "2026-11-01"), o("c", "2026-11-20"), o("d", "2026-11-04", "entregue")], 7, "2026-11-03");
  assert.deepEqual(list.map((x) => x.id), ["a", "b"]);
});
