"use client";

import { useEffect, useState } from "react";
import { onRefresh, refresh, sb } from "./supabase";

// Leitura e gravação no banco. As telas usam camelCase e o banco usa snake_case: a troca acontece só aqui.
// Só o primeiro nível vira coluna; listas como os itens de uma receita ficam como estão, em jsonb.

const toSnake = (key: string) => key.replace(/[A-Z]/g, (c) => `_${c.toLowerCase()}`);
const toCamel = (key: string) => key.replace(/_([a-z])/g, (_, c: string) => c.toUpperCase());

export function toRow(obj: object): Record<string, unknown> {
  return Object.fromEntries(Object.entries(obj).filter(([, v]) => v !== undefined).map(([k, v]) => [toSnake(k), v]));
}

export function fromRow<T>(row: Record<string, unknown>): T {
  return Object.fromEntries(Object.entries(row).filter(([k]) => k !== "user_id").map(([k, v]) => [toCamel(k), v])) as T;
}

export type Op =
  | { op: "set" | "add" | "update"; table: string; id: string; row: Record<string, unknown> }
  | { op: "delete"; table: string; id: string };

export const setOp = (table: string, id: string, data: object): Op => ({ op: "set", table, id, row: toRow(data) });
export const addOp = (table: string, id: string, data: object): Op => ({ op: "add", table, id, row: toRow(data) });
export const updateOp = (table: string, id: string, data: object): Op => ({ op: "update", table, id, row: toRow(data) });
export const deleteOp = (table: string, id: string): Op => ({ op: "delete", table, id });

export const newId = () => crypto.randomUUID();

/** Grava tudo junto (ou nada) e só termina depois que a tela já estiver com os dados novos. */
export async function commit(ops: Op[]) {
  if (!ops.length) return;
  const { error } = await sb()!.rpc("gravar_lote", { ops });
  if (error) throw error;
  await refresh();
}

const PAGE = 1000;

async function readAll(table: string) {
  const rows: Record<string, unknown>[] = [];
  for (let from = 0; ; from += PAGE) {
    const { data, error } = await sb()!.from(table).select("*").order("id").range(from, from + PAGE - 1);
    if (error) throw error;
    rows.push(...data);
    if (data.length < PAGE) return rows;
  }
}

/** Lê as tabelas do app (são poucos dados por pessoa) e recarrega depois de cada gravação e ao voltar para a aba. */
export function useTables<T extends string>(tables: readonly T[], uid: string) {
  const [raw, setRaw] = useState<Record<T, Record<string, unknown>[]> | null>(null);
  const [failed, setFailed] = useState(false);
  const key = tables.join();

  useEffect(() => {
    let alive = true;
    const load = async () => {
      try {
        const all = await Promise.all(tables.map(readAll));
        if (alive) setRaw(Object.fromEntries(tables.map((t, i) => [t, all[i]])) as Record<T, Record<string, unknown>[]>);
      } catch {
        if (alive) setFailed(true);
      }
    };
    void load();
    const off = onRefresh(load);
    const onFocus = () => void load();
    window.addEventListener("focus", onFocus);
    return () => {
      alive = false;
      off();
      window.removeEventListener("focus", onFocus);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key, uid]);

  return { raw, failed };
}
