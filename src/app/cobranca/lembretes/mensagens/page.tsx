"use client";

import { useState } from "react";
import { DEFAULT_TEMPLATES, STAGE_LABEL, type Stage } from "@/lib/cobranca-core";
import { saveTemplate } from "@/lib/cobranca-data";
import { errorText } from "@/lib/supabase";
import { ErrorBox, Notice } from "@/components/ui";
import { useCob } from "../../CobData";
import { CobShell } from "../../shell";

const STAGES: Stage[] = ["antes", "dia", "depois"];

export default function Mensagens() {
  const { templates } = useCob();
  const [saved, setSaved] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  return (
    <CobShell back={{ href: "/cobranca/lembretes/", label: "Lembretes" }} title="Modelos de mensagem">
      {saved && <Notice kind="ok">{saved}</Notice>}
      <ErrorBox error={error} />
      <p className="lead">Escreva do seu jeito. As palavras entre chaves são trocadas sozinhas:</p>
      <div className="pills">
        {["{nome}", "{valor}", "{vencimento}", "{referencia}", "{pix}", "{seu_nome}"].map((v) => <span key={v} className="pill accent num">{v}</span>)}
      </div>
      {STAGES.map((s) => <TemplateCard key={`${s}:${templates[s]}`} stage={s} value={templates[s]} onSave={async (body) => {
        setError(null);
        try {
          await saveTemplate(s, body);
          setSaved(`${STAGE_LABEL[s]}: mensagem salva.`);
        } catch (err) {
          setError(errorText(err));
        }
      }} />)}
    </CobShell>
  );
}

function TemplateCard({ stage, value, onSave }: { stage: Stage; value: string; onSave: (body: string) => Promise<void> }) {
  const [body, setBody] = useState(value);
  return (
    <form className="card" onSubmit={(e) => { e.preventDefault(); if (body.trim()) void onSave(body.slice(0, 2000)); }}>
      <label className="field">
        <span>{STAGE_LABEL[stage]}</span>
        <textarea value={body} onChange={(e) => setBody(e.target.value)} required maxLength={2000} />
      </label>
      <div className="row" style={{ gap: 8 }}>
        <button className="btn sm">Salvar</button>
        {value !== DEFAULT_TEMPLATES[stage] && <button type="button" className="btn ghost sm" onClick={() => void onSave(DEFAULT_TEMPLATES[stage])}>Voltar ao padrão</button>}
      </div>
    </form>
  );
}
