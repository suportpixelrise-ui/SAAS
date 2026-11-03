// Links oficiais do WhatsApp (wa.me): abrem a conversa no celular do usuário com o texto pronto.
// Não usamos API não oficial: quem aperta "enviar" é sempre a própria pessoa.

/** Deixa só os números e coloca o 55 do Brasil quando faltar. Devolve null se não parecer um celular. */
export function normalizePhone(raw: string): string | null {
  let d = (raw ?? "").replace(/\D/g, "");
  if (d.startsWith("00")) d = d.slice(2);
  if (d.length === 10 || d.length === 11) d = "55" + d;
  if (d.length < 12 || d.length > 13) return null;
  return d;
}

export function formatPhone(digits: string): string {
  const d = digits.startsWith("55") ? digits.slice(2) : digits;
  if (d.length === 11) return `(${d.slice(0, 2)}) ${d.slice(2, 7)}-${d.slice(7)}`;
  if (d.length === 10) return `(${d.slice(0, 2)}) ${d.slice(2, 6)}-${d.slice(6)}`;
  return digits;
}

export function waLink(phone: string, text: string): string {
  return `https://wa.me/${phone}?text=${encodeURIComponent(text)}`;
}

/** Troca {nome}, {valor} etc. pelos valores. Campo desconhecido fica como está. */
export function fillTemplate(template: string, vars: Record<string, string>): string {
  return template.replace(/\{(\w+)\}/g, (all, k: string) => (k in vars ? vars[k] : all));
}
