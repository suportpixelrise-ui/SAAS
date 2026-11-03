import { test } from "node:test";
import assert from "node:assert/strict";
import {
  applyAttendance, buildMessage, missingMonthlyCharges, monthSummary, newCharge, packageCharge, reminderQueue, sentPatch, undoAttendance,
  type Charge, type Client, type Profile,
} from "../src/lib/cobranca-core.ts";
import { priceFor as sitePrice, hash as siteHash } from "../src/lib/products.ts";
import { priceFor as fnPrice, hash as fnHash } from "../supabase/functions/_shared/plans.js";

const client = (p: Partial<Client>): Client => ({
  id: "c1", name: "Ana Souza", phone: "5511987654321", billingType: "mensal", amountCents: 18000, dueDay: 3,
  packageSessions: null, paused: false, notes: null, startMonth: "2026-09", createdAt: "2026-09-01T00:00:00Z", ...p,
});
const NOV = new Date("2026-11-03T15:00:00Z");

test("mensalidades que faltam: do mês de início até agora, sem repetir", () => {
  const c = client({});
  const missing = missingMonthlyCharges([c], [], NOV);
  assert.deepEqual(missing.map((m) => m.period), ["2026-09", "2026-10", "2026-11"]);
  assert.equal(missing[2].dueDate, "2026-11-03");
  assert.equal(missing[2].id, "c1_2026-11");
  assert.equal(missingMonthlyCharges([c], missing, NOV).length, 0);
  assert.equal(missingMonthlyCharges([client({ paused: true })], [], NOV).length, 0);
});

test("painel do mês conta pessoas, não cobranças", () => {
  const ch = (id: string, clientId: string, due: string, status: Charge["status"] = "aberta") =>
    newCharge({ id, clientId, kind: "sessao", period: id, description: "x", amountCents: 9000, dueDate: due, status });
  const s = monthSummary([ch("a", "b1", "2026-11-03"), ch("b", "b1", "2026-11-03"), ch("c", "p1", "2026-11-01"), ch("d", "q1", "2026-11-02", "paga")], "2026-11", "2026-11-03");
  assert.equal(s.dueToday, 1);
  assert.equal(s.owingClients, 1);
  assert.equal(s.paidClients, 1);
  assert.equal(s.open, 27000);
});

test("pacote: sessão e falta sem aviso descontam; falta avisada não", () => {
  const c = client({ billingType: "pacote", packageSessions: 2, dueDay: null });
  const pkg = packageCharge("p1", c, "2026-11-05");
  const ids = { attendance: "a1", charge: "x1" };
  const r1 = applyAttendance(c, [pkg], "presenca", ids);
  assert.ok(r1.ok && r1.chargeUpdate?.packageUsed === 1);
  const r2 = applyAttendance(c, [pkg], "falta_avisada", ids);
  assert.ok(r2.ok && !r2.chargeUpdate);
  const full = { ...pkg, packageUsed: 2 };
  assert.deepEqual(applyAttendance(c, [full], "falta", ids), { ok: false, reason: "pacote_acabou" });
  const undo = undoAttendance(c, [full], { id: "a1", clientId: "c1", chargeId: "p1", date: "2026-11-03", kind: "presenca", createdAt: "" });
  assert.equal(undo.chargeUpdate?.packageUsed, 1);
});

test("por sessão: cada sessão vira uma cobrança", () => {
  const c = client({ billingType: "sessao", amountCents: 9000, dueDay: null });
  const r = applyAttendance(c, [], "falta", { attendance: "a9", charge: "s9" }, "2026-11-03");
  assert.ok(r.ok && r.newCharge?.amountCents === 9000 && r.newCharge.description === "a falta sem aviso de 03/11");
});

test("fila de lembretes: antes, no dia e depois, sem repetir a mesma etapa", () => {
  const c = client({});
  const due = (d: string) => [newCharge({ id: "m", clientId: "c1", kind: "mensal", period: "2026-11", description: "a mensalidade de novembro", amountCents: 18000, dueDate: d })];
  assert.equal(reminderQueue([c], due("2026-11-05"), "2026-11-03")[0].stage, "antes");
  assert.equal(reminderQueue([c], due("2026-11-03"), "2026-11-03")[0].stage, "dia");
  const late = due("2026-11-01");
  assert.equal(reminderQueue([c], late, "2026-11-03")[0].stage, "depois");
  const sent = [{ ...late[0], ...sentPatch("depois", late[0], "2026-11-03") }];
  assert.equal(reminderQueue([c], sent, "2026-11-05").length, 0);
  assert.equal(reminderQueue([c], sent, "2026-11-10").length, 1);
});

test("mensagem com nome, valor e Pix", () => {
  const profile: Profile = { niche: "personal", displayName: "Carla", pixKey: "carla@exemplo.test", pixName: "Carla Ribeiro", city: "São Paulo" };
  const charges = [newCharge({ id: "m", clientId: "c1", kind: "mensal", period: "2026-11", description: "a mensalidade de novembro", amountCents: 18000, dueDate: "2026-11-03" })];
  const m = buildMessage(profile, "Oi, {nome}! {referencia}, {valor}. {pix}", client({}), charges);
  assert.ok(m.text.startsWith("Oi, Ana! a mensalidade de novembro, R$ 180,00. 000201"));
  assert.ok(m.pix.includes("5406180.00"));
});

test("teste de preço: o site e as Functions sorteiam o mesmo preço", () => {
  for (const uid of ["abc", "Zx81kq", "u-123", "8f7a6s5d4f"]) {
    assert.equal(siteHash(uid), fnHash(uid));
    assert.equal(sitePrice(uid, "cobranca"), fnPrice(uid, "cobranca", "mensal"));
    assert.equal(sitePrice(uid, "sobra", "anual"), fnPrice(uid, "sobra", "anual"));
  }
});
