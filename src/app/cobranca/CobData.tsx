"use client";

import { createContext, useContext, useEffect, useMemo, useRef, type ReactNode } from "react";
import { usePathname, useRouter } from "next/navigation";
import { fromRow, useTables } from "@/lib/db";
import { useSession } from "@/lib/session";
import { mergeTemplates, missingMonthlyCharges, reminderQueue, words, type Attendance, type Charge, type Client, type Profile, type Stage } from "@/lib/cobranca-core";
import { writeCharges } from "@/lib/cobranca-data";
import { Loading, Notice } from "@/components/ui";

export interface CobState {
  uid: string; email: string | null; profile: Profile | null; templates: Record<Stage, string>;
  clients: Client[]; charges: Charge[]; attendance: Attendance[]; w: ReturnType<typeof words>; pendingReminders: number;
}

const Ctx = createContext<CobState | null>(null);
export function useCob(): CobState {
  const v = useContext(Ctx);
  if (!v) throw new Error("useCob fora do CobData");
  return v;
}

const TABLES = ["cob_profile", "cob_templates", "cob_clients", "cob_charges", "cob_attendance"] as const;

/** Lê todos os dados da Cobrança (são poucos por pessoa) e cria as mensalidades que faltam. */
export function CobData({ children }: { children: ReactNode }) {
  const { user } = useSession();
  const router = useRouter();
  const path = usePathname();
  const { raw, failed } = useTables(TABLES, user.uid);

  const state = useMemo<CobState | null>(() => {
    if (!raw) return null;
    const main = raw.cob_profile.find((d) => d.id === "main");
    const profile = main ? fromRow<Profile>(main) : null;
    const templates = mergeTemplates(Object.fromEntries(raw.cob_templates.map((d) => [d.id as string, d.body as string])));
    const clients = raw.cob_clients.map((d) => fromRow<Client>(d));
    const charges = raw.cob_charges.map((d) => fromRow<Charge>(d));
    const attendance = raw.cob_attendance.map((d) => fromRow<Attendance>(d));
    return { uid: user.uid, email: user.email, profile, templates, clients, charges, attendance, w: words(profile), pendingReminders: reminderQueue(clients, charges).length };
  }, [raw, user.uid, user.email]);

  // Mensalidades do mês: criadas uma vez por carregamento, com id fixo (cliente + mês) para nunca duplicar.
  const generating = useRef(false);
  useEffect(() => {
    if (!state || generating.current) return;
    const missing = missingMonthlyCharges(state.clients, state.charges);
    if (!missing.length) return;
    generating.current = true;
    writeCharges(missing).finally(() => (generating.current = false));
  }, [state]);

  const onSetup = path.startsWith("/cobranca/comecar");
  useEffect(() => {
    if (!state) return;
    if (!state.profile && !onSetup) router.replace("/cobranca/comecar/");
  }, [state, onSetup, router]);

  if (failed) return <div className="app" data-app="cobranca"><main className="content no-tabs"><Notice kind="bad">Não deu para carregar seus dados. Confira a internet ou a sua assinatura.</Notice></main></div>;
  if (!state || (!state.profile && !onSetup)) return <Loading app="cobranca" />;
  return <Ctx.Provider value={state}>{children}</Ctx.Provider>;
}
