"use client";

import { useState } from "react";
import { errorText } from "@/lib/supabase";
import type { Profile } from "@/lib/cobranca-core";
import { saveProfile } from "@/lib/cobranca-data";
import { ErrorBox } from "@/components/ui";
import { parseSetup } from "./forms";

const NICHE_OPTIONS = [
  ["personal", "Personal trainer"],
  ["professor", "Professor particular"],
  ["pilates", "Estúdio de pilates"],
  ["escolinha", "Escolinha"],
  ["nutricao", "Nutricionista"],
  ["outro", "Outro serviço"],
] as const;

export function SetupForm({ initial, submitLabel, onSaved }: { initial?: Profile | null; submitLabel: string; onSaved: () => void }) {
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  async function submit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const parsed = parseSetup(new FormData(e.currentTarget));
    if (typeof parsed === "string") return setError(parsed);
    setPending(true);
    setError(null);
    try {
      await saveProfile(parsed);
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
          {NICHE_OPTIONS.map(([v, l]) => (
            <label className="choice" key={v}>
              <input type="radio" name="niche" value={v} required defaultChecked={initial?.niche === v} />
              <span>{l}</span>
            </label>
          ))}
        </div>
      </fieldset>

      <fieldset className="stack" style={{ border: 0, padding: 0, margin: 0, gap: 12 }}>
        <legend className="label" style={{ marginBottom: 10 }}>2 · Como você aparece nas mensagens</legend>
        <label className="field"><span>Seu nome ou do seu negócio</span><input name="display_name" required defaultValue={initial?.displayName} placeholder="Ex.: Carla Personal" autoComplete="organization" /></label>
      </fieldset>

      <fieldset className="stack" style={{ border: 0, padding: 0, margin: 0, gap: 12 }}>
        <legend className="label" style={{ marginBottom: 10 }}>3 · Para onde vai o Pix</legend>
        <label className="field"><span>Sua chave Pix</span><input name="pix_key" required defaultValue={initial?.pixKey} placeholder="CPF, celular, e-mail ou chave aleatória" autoComplete="off" /><small>O dinheiro cai direto na sua conta. O app não toca nele.</small></label>
        <label className="field"><span>Nome do dono da conta</span><input name="pix_name" defaultValue={initial?.pixName} placeholder="Como está no banco" autoComplete="name" /><small>Se deixar vazio, usamos o nome acima.</small></label>
        <label className="field"><span>Cidade</span><input name="city" required defaultValue={initial?.city} placeholder="Ex.: São Paulo" autoComplete="address-level2" /></label>
      </fieldset>

      <ErrorBox error={error} />
      <button className="btn" disabled={pending}>{pending ? "Salvando…" : submitLabel}</button>
    </form>
  );
}
