// Testes das regras de segurança do banco, num Postgres que roda dentro do próprio Node (sem Docker).
// Roda a migração de verdade e imita só o que o Supabase traz pronto (papéis, auth.uid e permissões padrão).
// Rodar com: npm run test:regras

import { test, before, beforeEach } from "node:test";
import assert from "node:assert/strict";
import { readdirSync, readFileSync } from "node:fs";
import { PGlite } from "@electric-sql/pglite";

const ANA = "00000000-0000-0000-0000-00000000000a";
const BIA = "00000000-0000-0000-0000-00000000000b";

const SUPABASE = `
  create role anon nologin;
  create role authenticated nologin;
  create role service_role nologin bypassrls;
  create schema auth;
  create table auth.users (id uuid primary key);
  create function auth.uid() returns uuid language sql stable as
    $$ select nullif(current_setting('test.sub', true), '')::uuid $$;
  grant usage on schema auth to anon, authenticated, service_role;
  grant usage on schema public to anon, authenticated, service_role;
  alter default privileges in schema public grant all on tables to anon, authenticated, service_role;
  alter default privileges in schema public grant all on functions to anon, authenticated, service_role;
  create publication supabase_realtime;
`;

let db: PGlite;

before(async () => {
  db = await PGlite.create();
  await db.exec(SUPABASE);
  for (const f of readdirSync("supabase/migrations").sort()) await db.exec(readFileSync(`supabase/migrations/${f}`, "utf8"));
  await db.exec(`insert into auth.users values ('${ANA}'), ('${BIA}')`);
});

beforeEach(async () => {
  await db.exec("truncate public.subscriptions, public.billing, public.cob_clients, public.sob_products cascade");
});

/** Roda como uma pessoa logada (uid) ou como visitante (null) e volta a ser administrador no fim. */
async function as<T>(uid: string | null, fn: () => Promise<T>): Promise<T> {
  await db.exec(`set test.sub = '${uid ?? ""}'; set role ${uid ? "authenticated" : "anon"};`);
  try {
    return await fn();
  } finally {
    await db.exec("reset role; set test.sub = '';");
  }
}

const sub = (uid: string, product: string, status: string, access: string) =>
  db.exec(`insert into public.subscriptions (user_id, product, status, cycle, price_cents, provider, access_until)
           values ('${uid}', '${product}', '${status}', 'mensal', 2990, 'simulado', now() + interval '${access}')`);

const client = (id: string) => ({
  op: "set", table: "cob_clients", id,
  row: { name: "Pedro", phone: "11999999999", billing_type: "mensal", amount_cents: 15000, due_day: 5, start_month: "2026-11" },
});

const lote = (ops: unknown[]) => db.query("select public.gravar_lote($1)", [JSON.stringify(ops)]);
const clients = async () => (await db.query<{ id: string; name: string; user_id: string }>("select * from public.cob_clients")).rows;

test("com assinatura ativa, a pessoa grava e lê os próprios dados", async () => {
  await sub(ANA, "cobranca", "ativa", "30 days");
  await as(ANA, async () => {
    await lote([client("c1")]);
    assert.equal((await clients()).length, 1);
  });
});

test("ninguém lê, muda nem apaga os dados de outra pessoa", async () => {
  await sub(ANA, "cobranca", "ativa", "30 days");
  await sub(BIA, "cobranca", "ativa", "30 days");
  await as(ANA, () => lote([client("c1")]));
  await as(BIA, async () => {
    assert.equal((await clients()).length, 0);
    await assert.rejects(lote([{ op: "update", table: "cob_clients", id: "c1", row: { name: "x" } }]));
    await db.query(`delete from public.cob_clients where id = 'c1'`);
    await db.query(`update public.cob_clients set name = 'x' where id = 'c1'`);
  });
  assert.equal((await clients())[0].name, "Pedro");
});

test("não dá para gravar uma linha em nome de outra pessoa", async () => {
  await sub(ANA, "cobranca", "ativa", "30 days");
  await sub(BIA, "cobranca", "ativa", "30 days");
  await as(BIA, async () => {
    await assert.rejects(db.query(
      `insert into public.cob_clients (user_id, id, name, phone, billing_type, amount_cents, start_month) values ($1, 'x', 'x', '1', 'mensal', 1, '2026-11')`, [ANA]));
    await lote([{ ...client("c2"), row: { ...client("c2").row, user_id: ANA } }]);
  });
  assert.equal((await clients())[0].user_id, BIA);
});

test("sem login, nada", async () => {
  await sub(ANA, "cobranca", "ativa", "30 days");
  await as(null, async () => {
    await assert.rejects(db.query("select * from public.cob_clients"));
    await assert.rejects(db.query("select * from public.subscriptions"));
    await assert.rejects(lote([client("c1")]));
  });
});

test("sem assinatura, vencida ou reembolsada, os dados do app ficam fechados", async () => {
  await as(ANA, () => assert.rejects(lote([client("c1")])));
  await sub(ANA, "cobranca", "ativa", "-1 day");
  await as(ANA, () => assert.rejects(lote([client("c1")])));
  await db.exec("truncate public.subscriptions");
  await sub(ANA, "cobranca", "reembolsada", "30 days");
  await as(ANA, () => assert.rejects(lote([client("c1")])));
});

test("cancelada continua valendo até o fim do período pago", async () => {
  await sub(ANA, "cobranca", "cancelada", "10 days");
  await as(ANA, () => lote([client("c1")]));
  assert.equal((await clients()).length, 1);
});

test("assinatura da Cobrança não abre os dados do Sobra", async () => {
  await sub(ANA, "cobranca", "ativa", "30 days");
  await as(ANA, () => assert.rejects(lote([{ op: "set", table: "sob_products", id: "p1", row: { name: "Brigadeiro", yield_units: 10 } }])));
});

test("a pessoa lê a própria assinatura, mas não muda nem vê a dos outros", async () => {
  await sub(ANA, "cobranca", "pendente", "0 days");
  await sub(BIA, "cobranca", "ativa", "30 days");
  await as(ANA, async () => {
    const { rows } = await db.query<{ user_id: string }>("select * from public.subscriptions");
    assert.deepEqual(rows.map((r) => r.user_id), [ANA]);
    await assert.rejects(db.query(`update public.subscriptions set status = 'ativa'`));
    await assert.rejects(db.query(`delete from public.subscriptions`));
    await assert.rejects(db.query(
      `insert into public.subscriptions (user_id, product, status, cycle, price_cents, provider) values ($1, 'sobra', 'ativa', 'mensal', 1, 'simulado')`, [ANA]));
  });
});

test("o lote não alcança tabelas de fora nem a pasta de cobrança do Asaas", async () => {
  await sub(ANA, "cobranca", "ativa", "30 days");
  await as(ANA, async () => {
    await assert.rejects(lote([{ op: "set", table: "subscriptions", id: "x", row: { status: "ativa" } }]));
    await assert.rejects(lote([{ op: "update", table: "cob_clients; drop table x", id: "x", row: {} }]));
    await assert.rejects(db.query("select * from public.billing"));
    await assert.rejects(db.query("select * from public.payment_settings"));
  });
});

test("o lote é tudo ou nada", async () => {
  await sub(ANA, "cobranca", "ativa", "30 days");
  await as(ANA, async () => {
    await assert.rejects(lote([client("c1"), { op: "set", table: "cob_clients", id: "c2", row: { name: "sem o resto" } }]));
    assert.equal((await clients()).length, 0);
  });
});

test("add não mexe no que já existe e set troca os valores", async () => {
  await sub(ANA, "cobranca", "ativa", "30 days");
  await as(ANA, async () => {
    await lote([client("c1")]);
    await lote([{ ...client("c1"), op: "add", row: { ...client("c1").row, name: "Outro" } }]);
    assert.equal((await clients())[0].name, "Pedro");
    await lote([{ ...client("c1"), row: { ...client("c1").row, name: "Novo" } }]);
    assert.equal((await clients())[0].name, "Novo");
  });
});

test("apagar um cliente leva junto as cobranças e as presenças dele", async () => {
  await sub(ANA, "cobranca", "ativa", "30 days");
  await as(ANA, async () => {
    await lote([
      client("c1"),
      { op: "set", table: "cob_charges", id: "ch1", row: { client_id: "c1", kind: "mensal", period: "2026-11", description: "Mensalidade", amount_cents: 15000, due_date: "2026-11-05", status: "aberta", package_used: 0 } },
      { op: "set", table: "cob_attendance", id: "a1", row: { client_id: "c1", date: "2026-11-03", kind: "presenca" } },
    ]);
    await lote([{ op: "delete", table: "cob_clients", id: "c1" }]);
    assert.equal((await db.query("select * from public.cob_charges")).rows.length, 0);
    assert.equal((await db.query("select * from public.cob_attendance")).rows.length, 0);
  });
});
