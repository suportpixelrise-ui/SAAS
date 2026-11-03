"use client";

import { commit, deleteOp, newId, setOp, updateOp, type Op } from "./db";
import { parseBRL } from "./format";
import { UNITS, type Unit } from "./sobra-calc";
import { ingredientUpdate, newIngredient, nowIso, type Ingredient, type Order, type OrderItem, type Product, type SobraProfile } from "./sobra-core";

// Gravações do app Sobra. As tabelas são as sob_* e cada linha é da pessoa logada.

export const saveSobraProfile = (p: SobraProfile) => commit([setOp("sob_profile", "main", p)]);

export async function createIngredient(name: string, unit: Unit, packageQty: number, priceCents: number) {
  const id = newId();
  await commit([setOp("sob_ingredients", id, newIngredient(id, name, unit, packageQty, priceCents))]);
  return id;
}

export const updateIngredient = (cur: Ingredient, name: string, unit: Unit, packageQty: number, priceCents: number) =>
  commit([updateOp("sob_ingredients", cur.id, ingredientUpdate(cur, name, unit, packageQty, priceCents))]);

export const deleteIngredient = (id: string) => commit([deleteOp("sob_ingredients", id)]);
export const dismissAlert = (id: string) => commit([updateOp("sob_ingredients", id, { alertSeen: true })]);

export interface RowIn { ingredientId?: string; name: string; unit: string; packageQty: string; price: string; qty: string }
export interface ProductFields { name: string; yieldUnits: number; packagingCents: number; gasMinutes: number; workMinutes: number; salePriceCents: number | null }

const toNum = (s: string) => Number(String(s).replace(",", "."));

/**
 * Salva a receita e, no mesmo lote, cria os insumos novos e atualiza o preço dos que mudaram.
 * Devolve o texto do erro ou o id do produto.
 */
export async function saveProduct(fields: ProductFields, rows: RowIn[], ingredients: Ingredient[], existing?: Product): Promise<string> {
  const ops: Op[] = [];
  const byId = new Map(ingredients.map((i) => [i.id, i]));
  const byName = new Map(ingredients.map((i) => [i.name.toLowerCase(), i]));
  const items: Product["items"] = [];
  for (const r of rows.filter((x) => x.name?.trim() || x.ingredientId)) {
    const label = r.name?.trim() || "um insumo";
    const qty = toNum(r.qty);
    const pkgQty = toNum(r.packageQty);
    const price = parseBRL(r.price);
    const unit = (UNITS.includes(r.unit as Unit) ? r.unit : "g") as Unit;
    if (!Number.isFinite(qty) || qty <= 0) throw new Error(`Diga quanto de ${label} vai na receita.`);
    if (!Number.isFinite(pkgQty) || pkgQty <= 0) throw new Error(`Diga o tamanho da embalagem de ${label}.`);
    if (price == null || price <= 0) throw new Error(`Diga quanto você pagou em ${label}.`);
    const cur = (r.ingredientId && byId.get(r.ingredientId)) || byName.get(r.name.trim().toLowerCase());
    let ingId: string;
    if (cur) {
      ingId = cur.id;
      if (cur.packagePriceCents !== price || cur.packageQty !== pkgQty || cur.unit !== unit) {
        ops.push(updateOp("sob_ingredients", cur.id, ingredientUpdate(cur, cur.name, unit, pkgQty, price)));
      }
    } else {
      ingId = newId();
      const created = newIngredient(ingId, r.name, unit, pkgQty, price);
      ops.push(setOp("sob_ingredients", ingId, created));
      byName.set(created.name.toLowerCase(), created);
    }
    items.push({ ingredientId: ingId, qty });
  }
  if (!items.length) throw new Error("Coloque pelo menos um insumo.");
  const id = existing?.id ?? newId();
  const product: Product = { ...fields, id, items, marginPct: existing?.marginPct ?? null, createdAt: existing?.createdAt ?? nowIso() };
  ops.push(setOp("sob_products", id, product));
  await commit(ops);
  return id;
}

export const setSalePrice = (id: string, cents: number, marginPct: number) =>
  commit([updateOp("sob_products", id, { salePriceCents: cents, marginPct })]);

export const deleteProduct = (id: string) => commit([deleteOp("sob_products", id)]);

export interface OrderFields { customerName: string; phone: string | null; deliveryDate: string; deliveryTime: string | null; depositCents: number; notes: string | null; items: OrderItem[] }

export async function saveOrder(f: OrderFields, existing?: Order): Promise<string> {
  const id = existing?.id ?? newId();
  const total = f.items.reduce((s, it) => s + it.qty * it.unitPriceCents, 0);
  const order: Order = { ...f, id, totalCents: total, status: existing?.status ?? "aberta", createdAt: existing?.createdAt ?? nowIso() };
  await commit([setOp("sob_orders", id, order)]);
  return id;
}

export function setOrderStatus(o: Order, status: Order["status"]) {
  return commit([updateOp("sob_orders", o.id, status === "paga" ? { status, depositCents: o.totalCents } : { status })]);
}

export const deleteOrder = (id: string) => commit([deleteOp("sob_orders", id)]);
