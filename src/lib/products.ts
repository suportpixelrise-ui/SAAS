// Os dois apps da base. Preços em centavos. Mantenha igual a supabase/functions/_shared/plans.js.
// `prices` tem um valor por app. Com mais de um, vira teste de preço: cada conta cai sempre no mesmo, calculado pelo uid.

export type ProductId = "cobranca" | "sobra";

export interface Product {
  id: ProductId;
  name: string;
  audience: string;
  tagline: string;
  home: string;
  prices: number[];
  yearlyPrice?: number;
  benefits: string[];
  /** Título em duas partes: a segunda sai na fonte de destaque. */
  paywallTitle: [string, string];
}

export const GUARANTEE_DAYS = 7;

export const PRODUCTS: Record<ProductId, Product> = {
  cobranca: {
    id: "cobranca",
    name: "Cobrança",
    audience: "Para personal, professores, pilates, escolinhas e nutricionistas",
    tagline: "Cobre seus alunos e clientes fixos pelo WhatsApp, com Pix, sem constrangimento.",
    home: "/cobranca/",
    prices: [2999],
    benefits: ["Clientes sem limite", "Lembretes de cobrança todo dia", "Painel de quem pagou e quem deve"],
    paywallTitle: ["Receba sem precisar", "ficar lembrando."],
  },
  sobra: {
    id: "sobra",
    name: "Sobra",
    audience: "Para confeiteiras, marmiteiras, salgadeiras e artesãs",
    tagline: "Saiba quanto custa cada doce, marmita ou peça e quanto você lucra em cada venda.",
    home: "/sobra/",
    prices: [1999],
    yearlyPrice: 9700,
    benefits: ["Produtos e receitas sem limite", "Aviso quando um insumo ficar mais caro", "Agenda de encomendas com sinal"],
    paywallTitle: ["Saiba quanto você ganha", "em cada venda."],
  },
};

export function isProductId(v: string): v is ProductId {
  return v === "cobranca" || v === "sobra";
}

/** FNV-1a: o mesmo número para o mesmo uid, aqui e nas Edge Functions. */
export function hash(text: string): number {
  let h = 0x811c9dc5;
  for (let i = 0; i < text.length; i++) {
    h ^= text.charCodeAt(i);
    h = Math.imul(h, 0x01000193) >>> 0;
  }
  return h;
}

export function priceFor(uid: string, product: ProductId, cycle: "mensal" | "anual" = "mensal"): number {
  const p = PRODUCTS[product];
  if (cycle === "anual" && p.yearlyPrice) return p.yearlyPrice;
  return p.prices[hash(`${uid}:${product}`) % p.prices.length];
}
