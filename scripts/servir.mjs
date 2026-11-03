// Servidor estático simples, parecido com o Netlify, para testar um site gerado antes de publicar.
// Uso: node scripts/servir.mjs dist/sobra 3100

import { createServer } from "node:http";
import { createReadStream, existsSync, statSync } from "node:fs";
import path from "node:path";

const root = path.resolve(process.argv[2] ?? "dist/cobranca");
const port = Number(process.argv[3] ?? 3100);
const TYPES = { ".html": "text/html; charset=utf-8", ".js": "text/javascript", ".css": "text/css", ".svg": "image/svg+xml", ".woff2": "font/woff2", ".txt": "text/plain", ".webmanifest": "application/manifest+json", ".json": "application/json" };

createServer((req, res) => {
  const url = decodeURIComponent(new URL(req.url ?? "/", "http://x").pathname);
  let file = path.join(root, url);
  if (!file.startsWith(root)) return void res.writeHead(403).end();
  if (existsSync(file) && statSync(file).isDirectory()) file = path.join(file, "index.html");
  else if (!existsSync(file) && existsSync(`${file}.html`)) file = `${file}.html`;
  if (!existsSync(file)) {
    res.writeHead(404, { "Content-Type": TYPES[".html"] });
    return void createReadStream(path.join(root, "404.html")).pipe(res);
  }
  res.writeHead(200, { "Content-Type": TYPES[path.extname(file)] ?? "application/octet-stream" });
  createReadStream(file).pipe(res);
}).listen(port, () => console.log(`Servindo ${root} em http://localhost:${port}`));
