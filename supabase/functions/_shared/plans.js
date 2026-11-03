// Preços dos dois apps em centavos. Mantenha igual a src/lib/products.ts.
// `prices` são as variantes do teste de preço; cada conta cai sempre na mesma (pelo uid).

export const PLANS = {
  cobranca: { name: "Cobrança", prices: [2990, 4990], yearly: null },
  sobra: { name: "Sobra", prices: [1490, 2490], yearly: 9700 },
};

export const GUARANTEE_DAYS = 7;
export const GRACE_DAYS = 3;

/** FNV-1a: o mesmo número para o mesmo uid, no navegador e aqui. */
export function hash(text) {
  let h = 0x811c9dc5;
  for (let i = 0; i < text.length; i++) {
    h ^= text.charCodeAt(i);
    h = Math.imul(h, 0x01000193) >>> 0;
  }
  return h;
}

export function priceFor(uid, product, cycle) {
  const plan = PLANS[product];
  if (cycle === "anual" && plan.yearly) return plan.yearly;
  return plan.prices[hash(`${uid}:${product}`) % plan.prices.length];
}
