// Gera o site de um app em out/. É o comando que o Netlify roda a cada atualização.
// O app vem da variável NEXT_PUBLIC_APP (cobranca ou sobra), definida em cada site do Netlify.

import { execSync } from "node:child_process";
import { existsSync, rmSync, writeFileSync } from "node:fs";
import path from "node:path";

const APPS = ["cobranca", "sobra"];
const app = process.env.NEXT_PUBLIC_APP;
if (!APPS.includes(app)) throw new Error('Defina NEXT_PUBLIC_APP como "cobranca" ou "sobra".');

const out = path.join(process.cwd(), "out");
rmSync(out, { recursive: true, force: true });
execSync("npx next build", { stdio: "inherit" });

for (const other of APPS.filter((a) => a !== app)) rmSync(path.join(out, other), { recursive: true, force: true });
const name = app === "sobra" ? "Sobra" : "Facilita IA";
writeFileSync(path.join(out, "manifest.webmanifest"), JSON.stringify({
  name, short_name: name, lang: "pt-BR", start_url: `/${app}/`, display: "standalone",
  background_color: "#F7F7FA", theme_color: app === "sobra" ? "#7054E6" : "#3A4AFF",
  icons: [{ src: "/icone.svg", sizes: "any", type: "image/svg+xml", purpose: "any" }],
}, null, 2));
if (!existsSync(path.join(out, "index.html"))) throw new Error(`O build de ${app} não gerou index.html`);
