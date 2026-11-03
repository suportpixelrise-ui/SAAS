// Regras do app Cobrança, sem banco e sem tela: recebem listas e devolvem resultados.
// As telas leem os dados do Firestore e usam estas funções; os testes também.

import { addDays, addMonths, brl, currentMonth, diffDays, dueDateFor, monthName, shortDate, today } from "./format.ts";
import { pixCopiaECola } from "./pix.ts";
import { fillTemplate } from "./whatsapp.ts";

export const NICHES = {
  personal: { label: "Personal trainer", one: "aluno", many: "alunos", Many: "Alunos" },
  professor: { label: "Professor particular", one: "aluno", many: "alunos", Many: "Alunos" },
  pilates: { label: "Estúdio de pilates", one: "aluno", many: "alunos", Many: "Alunos" },
  escolinha: { label: "Escolinha", one: "aluno", many: "alunos", Many: "Alunos" },
  nutricao: { label: "Nutricionista", one: "paciente", many: "pacientes", Many: "Pacientes" },
  outro: { label: "Outro serviço", one: "cliente", many: "clientes", Many: "Clientes" },
} as const;
export type Niche = keyof typeof NICHES;
export const isNiche = (v: string): v is Niche => v in NICHES;

export type BillingType = "mensal" | "pacote" | "sessao";
export type Stage = "antes" | "dia" | "depois";
export type AttendanceKind = "presenca" | "falta_avisada" | "falta";

export interface Profile { niche: Niche; displayName: string; pixKey: string; pixName: string; city: string }
export interface Client {
  id: string; name: string; phone: string; billingType: BillingType; amountCents: number;
  dueDay: number | null; packageSessions: number | null; paused: boolean; notes: string | null; startMonth: string; createdAt: string;
}
export interface Charge {
  id: string; clientId: string; kind: BillingType; period: string; description: string; amountCents: number; dueDate: string;
  status: "aberta" | "paga"; paidAt: string | null; paidMethod: string | null; packageTotal: number | null; packageUsed: number;
  remindedAntes: string | null; remindedDia: string | null; remindedDepois: string | null; createdAt: string;
}
export interface Attendance { id: string; clientId: string; chargeId: string | null; date: string; kind: AttendanceKind; createdAt: string }

export const DEFAULT_TEMPLATES: Record<Stage, string> = {
  antes: "Oi, {nome}! Passando para lembrar que {referencia}, de {valor}, vence em {vencimento}. Segue o Pix copia e cola:\n\n{pix}\n\nQualquer coisa, é só me chamar. Até mais!",
  dia: "Oi, {nome}! Hoje vence {referencia}, de {valor}. Segue o Pix copia e cola:\n\n{pix}\n\nQualquer dúvida, é só me chamar. Obrigado!",
  depois: "Oi, {nome}, tudo bem? Não encontrei o pagamento de {referencia}, de {valor}, que venceu em {vencimento}. Se já pagou, pode desconsiderar. Segue o Pix copia e cola:\n\n{pix}",
};
export const STAGE_LABEL: Record<Stage, string> = { antes: "Antes do vencimento", dia: "No dia do vencimento", depois: "Depois do vencimento" };
export const TYPE_LABEL: Record<BillingType, string> = { mensal: "Mensalidade", pacote: "Pacote", sessao: "Por sessão" };
export const METHOD_LABEL: Record<string, string> = { pix: "Pix", dinheiro: "Dinheiro", cartao: "Cartão", outro: "Outro" };
export const ATT_LABEL: Record<AttendanceKind, string> = { presenca: "Sessão", falta_avisada: "Falta avisada", falta: "Falta sem aviso" };

export const words = (p: Profile | null) => NICHES[p?.niche ?? "outro"] ?? NICHES.outro;
export const nowIso = () => new Date().toISOString();

export function mergeTemplates(saved: Partial<Record<Stage, string>>): Record<Stage, string> {
  return { ...DEFAULT_TEMPLATES, ...Object.fromEntries(Object.entries(saved).filter(([, v]) => v)) };
}

/** Texto curto da cobrança, sem o artigo: "Mensalidade de novembro". */
export const chargeTitle = (c: Pick<Charge, "description">) => c.description.replace(/^(a|o) /, "").replace(/^./, (x) => x.toUpperCase());

// ---------- mensalidades ----------

/** Id fixo da mensalidade: o mesmo cliente e o mesmo mês nunca geram duas cobranças. */
export const monthlyChargeId = (clientId: string, ym: string) => `${clientId}_${ym}`;

/** Mensalidades que faltam criar, do mês de início até o mês atual, para quem não está pausado. */
export function missingMonthlyCharges(clients: Client[], charges: Charge[], now = new Date()): Charge[] {
  const ym = currentMonth(now);
  const have = new Set(charges.map((c) => c.id));
  const out: Charge[] = [];
  for (const c of clients) {
    if (c.billingType !== "mensal" || c.paused || !c.dueDay) continue;
    const periods = charges.filter((x) => x.clientId === c.id && x.kind === "mensal").map((x) => x.period).sort();
    let m = periods.length ? addMonths(periods[periods.length - 1], 1) : c.startMonth;
    if (m < c.startMonth) m = c.startMonth;
    for (let guard = 0; m <= ym && guard < 24; guard++, m = addMonths(m, 1)) {
      const id = monthlyChargeId(c.id, m);
      if (have.has(id)) continue;
      out.push(newCharge({ id, clientId: c.id, kind: "mensal", period: m, description: `a mensalidade de ${monthName(m)}`, amountCents: c.amountCents, dueDate: dueDateFor(m, c.dueDay) }));
    }
  }
  return out;
}

export function newCharge(p: Pick<Charge, "id" | "clientId" | "kind" | "period" | "description" | "amountCents" | "dueDate"> & Partial<Charge>): Charge {
  return {
    status: "aberta", paidAt: null, paidMethod: null, packageTotal: null, packageUsed: 0,
    remindedAntes: null, remindedDia: null, remindedDepois: null, createdAt: nowIso(), ...p,
  };
}

export function packageCharge(id: string, client: Pick<Client, "id" | "amountCents" | "packageSessions">, due: string): Charge {
  const n = client.packageSessions ?? 1;
  return newCharge({ id, clientId: client.id, kind: "pacote", period: `P:${id}`, description: `o pacote de ${n} ${n === 1 ? "sessão" : "sessões"}`, amountCents: client.amountCents, dueDate: due, packageTotal: n });
}

// ---------- consultas ----------

export const openOf = (charges: Charge[], clientId: string) =>
  charges.filter((c) => c.clientId === clientId && c.status === "aberta").sort((a, b) => a.dueDate.localeCompare(b.dueDate));

export const historyOf = (charges: Charge[], clientId: string) =>
  charges.filter((c) => c.clientId === clientId).sort((a, b) => b.dueDate.localeCompare(a.dueDate) || b.createdAt.localeCompare(a.createdAt)).slice(0, 60);

export function currentPackage(charges: Charge[], clientId: string): Charge | null {
  return charges.filter((c) => c.clientId === clientId && c.kind === "pacote")
    .sort((a, b) => b.dueDate.localeCompare(a.dueDate) || b.createdAt.localeCompare(a.createdAt))[0] ?? null;
}

export interface ClientRow extends Client { openCents: number; openCount: number; nextDue: string | null }

export function clientRows(clients: Client[], charges: Charge[], q = ""): ClientRow[] {
  const s = q.trim().toLowerCase();
  return clients
    .filter((c) => c.name.toLowerCase().includes(s))
    .map((c) => {
      const open = openOf(charges, c.id);
      return { ...c, openCents: open.reduce((t, x) => t + x.amountCents, 0), openCount: open.length, nextDue: open[0]?.dueDate ?? null };
    })
    .sort((a, b) => Number(a.paused) - Number(b.paused) || a.name.localeCompare(b.name, "pt-BR"));
}

export interface MonthSummary { total: number; paid: number; open: number; paidClients: number; owingClients: number; dueToday: number }

export function monthSummary(charges: Charge[], ym: string, ref = today()): MonthSummary {
  const s: MonthSummary = { total: 0, paid: 0, open: 0, paidClients: 0, owingClients: 0, dueToday: 0 };
  const byClient = new Map<string, { open: number; overdue: boolean; today: boolean }>();
  for (const r of charges) {
    if (r.dueDate.slice(0, 7) !== ym) continue;
    s.total += r.amountCents;
    const st = byClient.get(r.clientId) ?? { open: 0, overdue: false, today: false };
    if (r.status === "paga") s.paid += r.amountCents;
    else {
      s.open += r.amountCents;
      st.open++;
      if (r.dueDate < ref) st.overdue = true;
      if (r.dueDate === ref) st.today = true;
    }
    byClient.set(r.clientId, st);
  }
  for (const st of byClient.values()) {
    if (st.open === 0) s.paidClients++;
    else if (st.overdue) s.owingClients++;
    else if (st.today) s.dueToday++;
  }
  return s;
}

export function stageFor(due: string, ref = today()): Stage {
  const d = diffDays(due, ref);
  return d > 0 ? "antes" : d === 0 ? "dia" : "depois";
}

export interface Due { client: Client; charges: Charge[]; total: number; firstDue: string; stage: Stage }

function groupOpen(clients: Client[], charges: Charge[], until: string, ref: string): Due[] {
  const byId = new Map(clients.map((c) => [c.id, c]));
  const map = new Map<string, Due>();
  for (const ch of [...charges].sort((a, b) => a.dueDate.localeCompare(b.dueDate))) {
    const client = byId.get(ch.clientId);
    if (!client || client.paused || ch.status !== "aberta" || ch.dueDate > until) continue;
    let d = map.get(client.id);
    if (!d) map.set(client.id, (d = { client, charges: [], total: 0, firstDue: ch.dueDate, stage: stageFor(ch.dueDate, ref) }));
    d.charges.push(ch);
    d.total += ch.amountCents;
  }
  return [...map.values()];
}

/** Quem tem algo vencido, vencendo hoje ou nos próximos 2 dias. */
export const toChargeSoon = (clients: Client[], charges: Charge[], ref = today()) => groupOpen(clients, charges, addDays(ref, 2), ref);

/** Fila de lembretes: 2 dias antes, no dia e depois (repete a cada 7 dias). Quem já foi lembrado na etapa sai. */
export function reminderQueue(clients: Client[], charges: Charge[], ref = today()): Due[] {
  return groupOpen(clients, charges, addDays(ref, 2), ref).filter((d) => {
    const first = d.charges[0];
    if (d.stage === "antes") return !first.remindedAntes && !first.remindedDia;
    if (d.stage === "dia") return !first.remindedDia;
    return !first.remindedDepois || diffDays(ref, first.remindedDepois) >= 7;
  });
}

/** Campos que mudam em cada cobrança aberta quando um lembrete é enviado. */
export function sentPatch(stage: Stage, c: Charge, ref = today()): Partial<Charge> {
  if (stage === "antes") return { remindedAntes: ref };
  if (stage === "dia") return { remindedDia: ref, remindedAntes: c.remindedAntes ?? ref };
  return { remindedDepois: ref, remindedDia: c.remindedDia ?? ref, remindedAntes: c.remindedAntes ?? ref };
}

export function lastSentAt(charges: Charge[], clientId: string): string | null {
  const dates = charges.filter((c) => c.clientId === clientId).flatMap((c) => [c.remindedAntes, c.remindedDia, c.remindedDepois]).filter(Boolean) as string[];
  return dates.sort().pop() ?? null;
}

// ---------- sessões e faltas ----------

export type AttendanceResult =
  | { ok: true; attendance: Attendance; chargeUpdate?: { id: string; packageUsed: number }; newCharge?: Charge }
  | { ok: false; reason: "pacote_acabou" };

/**
 * Presença e falta sem aviso descontam do pacote e geram cobrança no "por sessão".
 * Falta avisada fica só registrada: não desconta nem cobra.
 */
export function applyAttendance(client: Client, charges: Charge[], kind: AttendanceKind, ids: { attendance: string; charge: string }, date = today()): AttendanceResult {
  const counts = kind !== "falta_avisada";
  let chargeId: string | null = null;
  let chargeUpdate: { id: string; packageUsed: number } | undefined;
  let created: Charge | undefined;
  if (client.billingType === "pacote" && counts) {
    const pkg = currentPackage(charges, client.id);
    if (!pkg || pkg.packageUsed >= (pkg.packageTotal ?? 0)) return { ok: false, reason: "pacote_acabou" };
    chargeUpdate = { id: pkg.id, packageUsed: pkg.packageUsed + 1 };
    chargeId = pkg.id;
  }
  if (client.billingType === "sessao" && counts) {
    chargeId = ids.charge;
    created = newCharge({
      id: ids.charge, clientId: client.id, kind: "sessao", period: `S:${ids.attendance}`,
      description: kind === "falta" ? `a falta sem aviso de ${shortDate(date)}` : `a sessão de ${shortDate(date)}`,
      amountCents: client.amountCents, dueDate: date,
    });
  }
  return { ok: true, attendance: { id: ids.attendance, clientId: client.id, chargeId, date, kind, createdAt: nowIso() }, chargeUpdate, newCharge: created };
}

/** O que desfazer o último registro muda: devolve a sessão ao pacote ou apaga a cobrança da sessão (se não foi paga). */
export function undoAttendance(client: Client, charges: Charge[], last: Attendance) {
  const charge = last.chargeId ? charges.find((c) => c.id === last.chargeId) : undefined;
  return {
    deleteAttendance: last.id,
    chargeUpdate: client.billingType === "pacote" && charge && last.kind !== "falta_avisada" ? { id: charge.id, packageUsed: Math.max(charge.packageUsed - 1, 0) } : undefined,
    deleteCharge: client.billingType === "sessao" && charge && charge.status === "aberta" ? charge.id : undefined,
  };
}

// ---------- mensagem ----------

function joinPt(items: string[]): string {
  if (items.length <= 1) return items[0] ?? "";
  return `${items.slice(0, -1).join(", ")} e ${items[items.length - 1]}`;
}

export function buildMessage(profile: Profile, template: string, client: Client, charges: Charge[]) {
  const total = charges.reduce((s, c) => s + c.amountCents, 0);
  const firstDue = charges.map((c) => c.dueDate).sort()[0] ?? today();
  const pix = pixCopiaECola({
    key: profile.pixKey,
    name: profile.pixName,
    city: profile.city,
    amountCents: total,
    txid: `COB${client.id.replace(/[^A-Za-z0-9]/g, "").slice(0, 10)}${firstDue.replace(/-/g, "").slice(2)}`,
  });
  const text = fillTemplate(template, {
    nome: client.name.trim().split(/\s+/)[0],
    valor: brl(total),
    vencimento: shortDate(firstDue),
    referencia: joinPt(charges.map((c) => c.description)) || "o pagamento",
    pix,
    seu_nome: profile.displayName,
  });
  return { text, pix, total, firstDue };
}
