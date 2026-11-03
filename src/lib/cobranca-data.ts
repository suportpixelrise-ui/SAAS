"use client";

import { addOp, commit, deleteOp, newId, setOp, updateOp, type Op } from "./db";
import { addMonths, currentMonth, dueDateFor, today } from "./format";
import {
  applyAttendance, nowIso, packageCharge, sentPatch, undoAttendance,
  type Attendance, type AttendanceKind, type Charge, type Client, type Profile, type Stage,
} from "./cobranca-core";

// Gravações do app Cobrança. As tabelas são as cob_* e cada linha é da pessoa logada.
// As telas leem pelo CobData e as regras de negócio vêm do cobranca-core.

export const saveProfile = (p: Profile) => commit([setOp("cob_profile", "main", p)]);
export const saveTemplate = (stage: Stage, body: string) => commit([setOp("cob_templates", stage, { body })]);

export interface ClientInput {
  name: string; phone: string; billingType: Client["billingType"]; amountCents: number;
  dueDay: number | null; packageSessions: number | null; notes: string | null; startMonth?: string; firstDueDate?: string;
}

export async function createClient(input: ClientInput): Promise<string> {
  const id = newId();
  const client: Client = {
    id, name: input.name, phone: input.phone, billingType: input.billingType, amountCents: input.amountCents, dueDay: input.dueDay,
    packageSessions: input.packageSessions, paused: false, notes: input.notes, startMonth: input.startMonth ?? currentMonth(), createdAt: nowIso(),
  };
  const ops = [setOp("cob_clients", id, client)];
  if (client.billingType === "pacote") {
    const chId = newId();
    ops.push(setOp("cob_charges", chId, packageCharge(chId, client, input.firstDueDate ?? today())));
  }
  await commit(ops);
  return id;
}

export async function updateClient(client: Client, input: ClientInput, charges: Charge[]) {
  const ops = [updateOp("cob_clients", client.id, {
    name: input.name, phone: input.phone, billingType: input.billingType, amountCents: input.amountCents,
    dueDay: input.dueDay, packageSessions: input.packageSessions, notes: input.notes,
  })];
  // O valor novo vale para a mensalidade deste mês se ela ainda não foi paga.
  if (input.billingType === "mensal" && input.dueDay) {
    const ym = currentMonth();
    for (const c of charges) {
      if (c.clientId === client.id && c.kind === "mensal" && c.period === ym && c.status === "aberta") {
        ops.push(updateOp("cob_charges", c.id, { amountCents: input.amountCents, dueDate: dueDateFor(ym, input.dueDay) }));
      }
    }
  }
  await commit(ops);
}

/** Apaga o cadastro. O banco leva junto as cobranças e as presenças dele. */
export const deleteClient = (clientId: string) => commit([deleteOp("cob_clients", clientId)]);

/** Pausar para de gerar mensalidades. Ao voltar, a cobrança recomeça no mês atual. */
export function setPaused(client: Client, paused: boolean) {
  const patch: Partial<Client> = { paused };
  if (!paused && client.startMonth < currentMonth()) patch.startMonth = currentMonth();
  return commit([updateOp("cob_clients", client.id, patch)]);
}

/** Mensalidades que faltam. "add" não mexe se outra aba já criou a mesma. */
export const writeCharges = (charges: Charge[]) => commit(charges.map((c) => addOp("cob_charges", c.id, c)));

export async function addAttendance(client: Client, charges: Charge[], kind: AttendanceKind) {
  const res = applyAttendance(client, charges, kind, { attendance: newId(), charge: newId() });
  if (!res.ok) return res;
  const ops: Op[] = [];
  if (res.newCharge) ops.push(setOp("cob_charges", res.newCharge.id, res.newCharge));
  ops.push(setOp("cob_attendance", res.attendance.id, res.attendance));
  if (res.chargeUpdate) ops.push(updateOp("cob_charges", res.chargeUpdate.id, { packageUsed: res.chargeUpdate.packageUsed }));
  await commit(ops);
  return res;
}

export async function undoLastAttendance(client: Client, charges: Charge[], attendance: Attendance[]) {
  const last = attendance.filter((a) => a.clientId === client.id).sort((a, b) => b.createdAt.localeCompare(a.createdAt))[0];
  if (!last) return;
  const u = undoAttendance(client, charges, last);
  const ops = [deleteOp("cob_attendance", u.deleteAttendance)];
  if (u.chargeUpdate) ops.push(updateOp("cob_charges", u.chargeUpdate.id, { packageUsed: u.chargeUpdate.packageUsed }));
  if (u.deleteCharge) ops.push(deleteOp("cob_charges", u.deleteCharge));
  await commit(ops);
}

export async function renewPackage(client: Client) {
  const id = newId();
  await commit([setOp("cob_charges", id, packageCharge(id, client, today()))]);
}

export const markPaid = (chargeIds: string[], method: string, date: string) =>
  commit(chargeIds.map((id) => updateOp("cob_charges", id, { status: "paga", paidAt: date, paidMethod: method })));

export const markUnpaid = (chargeId: string) =>
  commit([updateOp("cob_charges", chargeId, { status: "aberta", paidAt: null, paidMethod: null })]);

export const markSent = (open: Charge[], stage: Stage) =>
  commit(open.map((c) => updateOp("cob_charges", c.id, sentPatch(stage, c))));

export const nextMonthName = () => addMonths(currentMonth(), 1);
