import { test } from "node:test";
import assert from "node:assert/strict";
import { costPerBase, unitCost, hourCost, suggestedPrice, profit, gasPerHour, profitDeltaPerUnit } from "../src/lib/sobra-calc.ts";

test("preço por grama e por kg", () => {
  assert.equal(costPerBase(749, 395, "g").toFixed(4), (749 / 395).toFixed(4));
  assert.equal(costPerBase(2000, 1, "kg"), 2); // R$ 20,00 o kg = 2 centavos por grama
  assert.equal(costPerBase(1000, 0, "un"), 0);
});

test("custo de uma unidade soma ingredientes, embalagem, gás e trabalho", () => {
  const c = unitCost({
    items: [
      { qty: 395, packagePriceCents: 749, packageQty: 395, unit: "g" }, // a lata inteira: R$ 7,49
      { qty: 20, packagePriceCents: 1000, packageQty: 200, unit: "g" }, // 20 g de um pote de R$ 10,00: R$ 1,00
    ],
    yieldUnits: 30,
    packagingCents: 12,
    gasMinutes: 30,
    workMinutes: 60,
    gasCostPerHourCents: 240,
    hourCostCents: 1500,
  });
  assert.equal(Math.round(c.ingredients), Math.round(849 / 30));
  assert.equal(c.packaging, 12);
  assert.equal(c.gas, 4);
  assert.equal(c.work, 50);
  assert.equal(Math.round(c.total), Math.round(849 / 30 + 12 + 4 + 50));
});

test("hora, gás, preço sugerido e lucro", () => {
  assert.equal(hourCost(300000, 160), 1875);
  assert.equal(gasPerHour(12000, 50), 240);
  assert.equal(suggestedPrice(92, 50), 140);
  assert.equal(suggestedPrice(100, 100), 200);
  assert.deepEqual(profit(250, 92).value, 158);
  assert.equal(Math.round(profitDeltaPerUnit(395, 30, 749 / 395, 839 / 395)), -3);
});
