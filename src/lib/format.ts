// Dinheiro sempre em centavos (inteiros) no banco; na tela, sempre "R$ 1.234,56".
// Datas de vencimento são "AAAA-MM-DD" no fuso de São Paulo.

const TZ = "America/Sao_Paulo";

export function brl(cents: number): string {
  const sign = cents < 0 ? "-" : "";
  const abs = Math.abs(Math.round(cents));
  const reais = Math.floor(abs / 100)
    .toString()
    .replace(/\B(?=(\d{3})+(?!\d))/g, ".");
  const cent = (abs % 100).toString().padStart(2, "0");
  // Espaço que não quebra: o "R$" nunca fica sozinho no fim da linha.
  return `${sign}R$ ${reais},${cent}`;
}

/** Aceita "180", "180,5", "1.234,56", "R$ 1.234,56" e "1234.56". Devolve centavos ou null. */
export function parseBRL(input: string | null | undefined): number | null {
  if (!input) return null;
  let s = String(input).replace(/R\$|\s/g, "");
  if (!s) return null;
  if (s.includes(",")) s = s.replace(/\./g, "").replace(",", ".");
  else if (/^\d{1,3}(\.\d{3})+$/.test(s)) s = s.replace(/\./g, "");
  if (!/^\d+(\.\d{1,2})?$/.test(s)) return null;
  return Math.round(parseFloat(s) * 100);
}

/** Centavos para o valor que vai no campo do formulário: "1234,56". */
export function centsToInput(cents: number | null | undefined): string {
  if (cents == null) return "";
  return (cents / 100).toFixed(2).replace(".", ",");
}

export function today(now: Date = new Date()): string {
  return new Intl.DateTimeFormat("en-CA", { timeZone: TZ, year: "numeric", month: "2-digit", day: "2-digit" }).format(now);
}

export function currentMonth(now: Date = new Date()): string {
  return today(now).slice(0, 7);
}

export function addDays(date: string, days: number): string {
  const d = new Date(`${date}T12:00:00Z`);
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
}

export function diffDays(a: string, b: string): number {
  return Math.round((Date.parse(`${a}T12:00:00Z`) - Date.parse(`${b}T12:00:00Z`)) / 86400000);
}

export function addMonths(ym: string, n: number): string {
  const [y, m] = ym.split("-").map(Number);
  const d = new Date(Date.UTC(y, m - 1 + n, 1));
  return d.toISOString().slice(0, 7);
}

/** Dia do vencimento dentro do mês, ajustando para meses curtos (dia 31 em fevereiro vira 28 ou 29). */
export function dueDateFor(ym: string, day: number): string {
  const [y, m] = ym.split("-").map(Number);
  const last = new Date(Date.UTC(y, m, 0)).getUTCDate();
  return `${ym}-${String(Math.min(Math.max(day, 1), last)).padStart(2, "0")}`;
}

const MESES = ["janeiro", "fevereiro", "março", "abril", "maio", "junho", "julho", "agosto", "setembro", "outubro", "novembro", "dezembro"];

export function monthName(ym: string): string {
  return MESES[Number(ym.slice(5, 7)) - 1];
}

export function monthLabel(ym: string): string {
  const name = monthName(ym);
  return name.charAt(0).toUpperCase() + name.slice(1) + (ym.slice(0, 4) === currentMonth().slice(0, 4) ? "" : ` de ${ym.slice(0, 4)}`);
}

/** "05/11" */
export function shortDate(date: string): string {
  return `${date.slice(8, 10)}/${date.slice(5, 7)}`;
}

/** "05/11/2026" */
export function fullDate(date: string): string {
  return `${date.slice(8, 10)}/${date.slice(5, 7)}/${date.slice(0, 4)}`;
}

/** Texto curto de quando vence, em relação a hoje. */
export function dueText(due: string, ref: string = today()): string {
  const d = diffDays(due, ref);
  if (d === 0) return "vence hoje";
  if (d === 1) return "vence amanhã";
  if (d > 1) return `vence em ${shortDate(due)}`;
  if (d === -1) return "1 dia de atraso";
  return `${-d} dias de atraso`;
}

export function initials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  return ((parts[0]?.[0] ?? "") + (parts.length > 1 ? parts[parts.length - 1][0] : "")).toUpperCase();
}

export function plural(n: number, one: string, many: string): string {
  return `${n} ${n === 1 ? one : many}`;
}
