"use client";

import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";

// Pixel da Meta: só no site do Facilita IA, só depois do aceite e só nas páginas públicas.
// Nunca roda dentro do app, onde estão os dados dos clientes de quem assina.

const ID = "3511185385722622";
const CHAVE = "facilita-cookies";
const LIGADO = process.env.NEXT_PUBLIC_APP === "cobranca";
const PAGINAS = ["", "/entrar", "/termos", "/privacidade"];

type Fbq = {
  (...args: unknown[]): void;
  callMethod?: (...args: unknown[]) => void;
  queue: unknown[]; push: unknown; loaded: boolean; version: string; disablePushState: boolean; allowDuplicatePageViews: boolean;
};

declare global {
  interface Window { fbq?: Fbq; _fbq?: Fbq }
}

function ler() {
  try {
    return localStorage.getItem(CHAVE);
  } catch {
    return null;
  }
}

function guardar(valor: string) {
  try {
    localStorage.setItem(CHAVE, valor);
  } catch {
    // Sem armazenamento, a escolha vale só até fechar a página.
  }
}

/** Links de senha trazem chaves de acesso no endereço, que não podem sair do site. */
function paginaPublica(path: string) {
  const { hash, search } = window.location;
  const params = new URLSearchParams(search);
  return PAGINAS.includes(path.replace(/\/$/, "")) && !hash && !params.has("nova") && !params.has("convite");
}

function carregar() {
  if (window.fbq) return;
  const f = function (...args: unknown[]) {
    if (f.callMethod) f.callMethod(...args);
    else f.queue.push(args);
  } as Fbq;
  f.push = f;
  f.loaded = true;
  f.version = "2.0";
  f.queue = [];
  // Sem isto, o pixel seguiria a pessoa para dentro do app e leria cliques e formulários sozinho.
  f.disablePushState = true;
  // Sem isto, a Meta ignora a visita ao cadastro quando a pessoa vem da página de venda sem recarregar.
  f.allowDuplicatePageViews = true;
  window.fbq = window._fbq = f;
  const script = document.createElement("script");
  script.async = true;
  script.src = "https://connect.facebook.net/en_US/fbevents.js";
  document.head.appendChild(script);
  f("set", "autoConfig", false, ID);
  f("init", ID);
}

function registrarVisita() {
  carregar();
  window.fbq?.("track", "PageView");
}

/** Conta criada no site. Não faz nada se a pessoa recusou os cookies. */
export function pixelCadastro() {
  window.fbq?.("track", "CompleteRegistration");
}

export function Pixel() {
  const path = usePathname();
  const [aviso, setAviso] = useState(false);

  useEffect(() => {
    const pode = LIGADO && paginaPublica(path);
    const escolha = ler();
    if (pode && escolha === "sim") registrarVisita();
    setAviso(pode && !escolha);
  }, [path]);

  function escolher(valor: "sim" | "nao") {
    guardar(valor);
    setAviso(false);
    if (valor === "sim") registrarVisita();
  }

  if (!aviso) return null;
  return (
    <div className="cookies night" role="region" aria-label="Aviso de cookies">
      <p>Usamos cookies para medir nossos anúncios, só se você aceitar. <a href="/privacidade/">Saiba mais</a></p>
      <div>
        <button className="btn ghost sm" onClick={() => escolher("nao")}>Recusar</button>
        <button className="btn sm" onClick={() => escolher("sim")}>Aceitar</button>
      </div>
    </div>
  );
}
