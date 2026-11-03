import type { Unit } from "./sobra-calc.ts";

// Modelos prontos para o primeiro preço sair rápido. Trazem só as QUANTIDADES da receita e o tamanho
// comum da embalagem; o preço de cada insumo quem coloca é a pessoa, porque cada uma compra num lugar.

export interface TemplateItem { name: string; unit: Unit; packageQty: number; qty: number }
export interface Template {
  id: string; name: string; niche: string; yieldUnits: number; gasMinutes: number; workMinutes: number; items: TemplateItem[];
}

export const TEMPLATES: Template[] = [
  {
    id: "brigadeiro", name: "Brigadeiro tradicional", niche: "doces", yieldUnits: 30, gasMinutes: 20, workMinutes: 60,
    items: [
      { name: "Leite condensado", unit: "g", packageQty: 395, qty: 395 },
      { name: "Chocolate em pó", unit: "g", packageQty: 200, qty: 30 },
      { name: "Manteiga", unit: "g", packageQty: 200, qty: 15 },
      { name: "Chocolate granulado", unit: "g", packageQty: 500, qty: 100 },
    ],
  },
  {
    id: "bolo-pote", name: "Bolo de pote", niche: "doces", yieldUnits: 10, gasMinutes: 50, workMinutes: 90,
    items: [
      { name: "Farinha de trigo", unit: "kg", packageQty: 1, qty: 240 },
      { name: "Açúcar", unit: "kg", packageQty: 1, qty: 200 },
      { name: "Ovos", unit: "un", packageQty: 12, qty: 3 },
      { name: "Leite", unit: "l", packageQty: 1, qty: 240 },
      { name: "Leite condensado", unit: "g", packageQty: 395, qty: 790 },
      { name: "Creme de leite", unit: "g", packageQty: 200, qty: 200 },
    ],
  },
  {
    id: "marmita", name: "Marmita de 500 g", niche: "marmitas", yieldUnits: 10, gasMinutes: 60, workMinutes: 150,
    items: [
      { name: "Arroz", unit: "kg", packageQty: 5, qty: 600 },
      { name: "Feijão", unit: "kg", packageQty: 1, qty: 300 },
      { name: "Peito de frango", unit: "kg", packageQty: 1, qty: 1200 },
      { name: "Legumes", unit: "kg", packageQty: 1, qty: 600 },
      { name: "Óleo", unit: "ml", packageQty: 900, qty: 60 },
    ],
  },
  {
    id: "coxinha", name: "Coxinha", niche: "salgados", yieldUnits: 50, gasMinutes: 70, workMinutes: 180,
    items: [
      { name: "Farinha de trigo", unit: "kg", packageQty: 1, qty: 500 },
      { name: "Peito de frango", unit: "kg", packageQty: 1, qty: 500 },
      { name: "Requeijão", unit: "g", packageQty: 200, qty: 200 },
      { name: "Farinha de rosca", unit: "g", packageQty: 500, qty: 250 },
      { name: "Óleo", unit: "ml", packageQty: 900, qty: 450 },
    ],
  },
  {
    id: "vela", name: "Vela aromática em pote", niche: "artesanato", yieldUnits: 10, gasMinutes: 30, workMinutes: 120,
    items: [
      { name: "Cera vegetal", unit: "kg", packageQty: 1, qty: 1000 },
      { name: "Essência", unit: "ml", packageQty: 100, qty: 60 },
      { name: "Pavio", unit: "un", packageQty: 50, qty: 10 },
      { name: "Pote de vidro", unit: "un", packageQty: 12, qty: 10 },
    ],
  },
];

export const NICHES_SOBRA = {
  doces: { label: "Doces e bolos" },
  marmitas: { label: "Marmitas" },
  salgados: { label: "Salgados" },
  artesanato: { label: "Artesanato" },
} as const;
export type SobraNiche = keyof typeof NICHES_SOBRA;
export const isSobraNiche = (v: string): v is SobraNiche => v in NICHES_SOBRA;
