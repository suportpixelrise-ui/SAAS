"use client";

import { useState } from "react";
import { errorText } from "@/lib/supabase";
import { centsToInput, parseBRL } from "@/lib/format";
import { gasPerHour } from "@/lib/sobra-calc";
import { isSobraNiche } from "@/lib/sobra-templates";
import type { SobraProfile } from "@/lib/sobra-core";
import { saveSobraProfile } from "@/lib/sobra-data";
import { ErrorBox } from "@/components/ui";

const NICHES = [["doces", "Doces e bolos"], ["marmitas", "Marmitas"], ["salgados", "Salgados"], ["artesanato", "Artesanato"]] as const;
const MARGINS = [20, 30, 50, 80, 100, 150];
const money = (c: number) => (c / 100).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

export function SobraSetupForm({ initial, submitLabel, onSaved }: { initial?: SobraProfile | null; submitLabel: string; onSaved: () => void }) {
  const [goal, setGoal] = useState(initial ? centsToInput(initial.monthlyGoalCents) : "");
  const [week, setWeek] = useState(initial ? String(initial.hoursPerWeek) : "");
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  // Mesma conta que fica salva: horas do mês = horas da semana × 4,33, arredondado.
  const monthHours = Math.round(Number(week) * 4.33);
  const hour = (parseBRL(goal) ?? 0) && monthHours ? (parseBRL(goal) ?? 0) / monthHours : 0;

  async function submit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const f = new FormData(e.currentTarget);
    const niche = String(f.get("niche") ?? "");
    const goalC = parseBRL(goal);
    const w = Number(week);
    const cylinder = parseBRL(String(f.get("cylinder") ?? "")) ?? 0;
    const cylHours = Number(f.get("cylinder_hours") || 0);
    const margin = Number(f.get("margin"));
    if (!isSobraNiche(niche)) return setError("Escolha o que você faz.");
    if (!goalC || goalC < 10000) return setError("Diga quanto quer ganhar por mês com o seu trabalho (ex.: 2.500,00).");
    if (!Number.isFinite(w) || w < 1 || w > 100) return setError("Diga quantas horas por semana você trabalha nisso (1 a 100).");
    if (cylinder > 0 && (!Number.isFinite(cylHours) || cylHours < 1)) return setError("Diga mais ou menos quantas horas de fogão e forno o botijão dura.");
    setPending(true);
    setError(null);
    try {
      await saveSobraProfile({
        niche, monthlyGoalCents: goalC, hoursPerWeek: Math.round(w), hoursPerMonth: Math.round(w * 4.33),
        cylinderCents: cylinder, cylinderHours: Math.round(cylHours || 0), gasCostPerHourCents: gasPerHour(cylinder, cylHours || 0),
        defaultMarginPct: MARGINS.includes(margin) ? margin : 50,
      });
      onSaved();
    } catch (err) {
      setError(errorText(err));
    } finally {
      setPending(false);
    }
  }

  return (
    <form onSubmit={submit} className="stack" style={{ gap: 20 }}>
      <fieldset className="stack" style={{ border: 0, padding: 0, margin: 0, gap: 10 }}>
        <legend className="label" style={{ marginBottom: 10 }}>1 · O que você faz?</legend>
        <div className="grid2">
          {NICHES.map(([v, l]) => (
            <label className="choice" key={v}><input type="radio" name="niche" value={v} required defaultChecked={initial?.niche === v} /><span>{l}</span></label>
          ))}
        </div>
      </fieldset>

      <fieldset className="stack" style={{ border: 0, padding: 0, margin: 0, gap: 12 }}>
        <legend className="label" style={{ marginBottom: 10 }}>2 · Quanto vale a sua hora</legend>
        <label className="field"><span>Quanto quer ganhar por mês com o seu trabalho</span><input name="goal" inputMode="decimal" required value={goal} onChange={(e) => setGoal(e.target.value)} placeholder="2.500,00" /></label>
        <label className="field"><span>Quantas horas por semana você trabalha nisso</span><input name="hours_week" type="number" inputMode="numeric" min={1} max={100} required value={week} onChange={(e) => setWeek(e.target.value)} placeholder="30" /></label>
        {hour > 0 && <div className="alert info">Sua hora vale <b className="num">{money(hour)}</b>. Esse valor entra no custo de cada produto.</div>}
      </fieldset>

      <fieldset className="stack" style={{ border: 0, padding: 0, margin: 0, gap: 12 }}>
        <legend className="label" style={{ marginBottom: 10 }}>3 · Gás (deixe vazio se não usa)</legend>
        <div className="grid2">
          <label className="field"><span>Preço do botijão</span><input name="cylinder" inputMode="decimal" defaultValue={initial?.cylinderCents ? centsToInput(initial.cylinderCents) : ""} placeholder="R$" /></label>
          <label className="field"><span>Dura quantas horas de fogo</span><input name="cylinder_hours" type="number" inputMode="numeric" min={1} defaultValue={initial?.cylinderHours || ""} /></label>
        </div>
        <small className="muted">Uma conta aproximada já ajuda. Dá para mudar depois em Ajustes.</small>
      </fieldset>

      <label className="field"><span>Quanto de lucro você quer em cima do custo</span>
        <select name="margin" defaultValue={String(initial?.defaultMarginPct ?? 50)}>
          {MARGINS.map((m) => <option key={m} value={m}>{m}% a mais que o custo</option>)}
        </select>
        <small>O custo já inclui o pagamento da sua hora. O lucro é o que sobra para o negócio crescer.</small>
      </label>

      <ErrorBox error={error} />
      <button className="btn" disabled={pending}>{pending ? "Salvando…" : submitLabel}</button>
    </form>
  );
}
