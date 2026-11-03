import { test } from "node:test";
import assert from "node:assert/strict";
import { pixCopiaECola, crc16, normalizePixKey } from "../src/lib/pix.ts";
import { brl, parseBRL, dueDateFor, diffDays, dueText, addMonths } from "../src/lib/format.ts";
import { normalizePhone, fillTemplate } from "../src/lib/whatsapp.ts";

test("Pix copia e cola bate com o exemplo do manual do BR Code", () => {
  const code = pixCopiaECola({ key: "123e4567-e12b-12d1-a456-426655440000", name: "Fulano de Tal", city: "BRASILIA" });
  assert.equal(
    code,
    "00020126580014br.gov.bcb.pix0136123e4567-e12b-12d1-a456-4266554400005204000053039865802BR5913Fulano de Tal6008BRASILIA62070503***63041D3D",
  );
});

test("Pix com valor e acentos", () => {
  const code = pixCopiaECola({ key: "carla@exemplo.com", name: "Carla Ribeirão", city: "São Paulo", amountCents: 18000, txid: "COB-123" });
  assert.match(code, /540618000\.00|5406180\.00/);
  assert.ok(code.includes("5914Carla Ribeirao"));
  assert.ok(code.includes("6009Sao Paulo"));
  assert.equal(code.slice(-4), crc16(code.slice(0, -4)));
});

test("chaves Pix", () => {
  assert.equal(normalizePixKey("(11) 98765-4321"), "+5511987654321");
  assert.equal(normalizePixKey("123.456.789-09"), "12345678909");
  assert.equal(normalizePixKey("Carla@Exemplo.com "), "carla@exemplo.com");
});

test("dinheiro", () => {
  assert.equal(brl(123456), "R$ 1.234,56");
  assert.equal(brl(5), "R$ 0,05");
  assert.equal(parseBRL("1.234,56"), 123456);
  assert.equal(parseBRL("180"), 18000);
  assert.equal(parseBRL("R$ 29,9"), 2990);
  assert.equal(parseBRL("1.000"), 100000);
  assert.equal(parseBRL("abc"), null);
});

test("datas", () => {
  assert.equal(dueDateFor("2026-02", 31), "2026-02-28");
  assert.equal(diffDays("2026-11-05", "2026-11-03"), 2);
  assert.equal(dueText("2026-11-01", "2026-11-03"), "2 dias de atraso");
  assert.equal(addMonths("2026-12", 1), "2027-01");
});

test("WhatsApp", () => {
  assert.equal(normalizePhone("(11) 98765-4321"), "5511987654321");
  assert.equal(normalizePhone("123"), null);
  assert.equal(fillTemplate("Oi, {nome}! {x}", { nome: "Ana" }), "Oi, Ana! {x}");
});
