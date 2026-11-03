import { addMonths, currentMonth, parseBRL, today } from "@/lib/format";
import { normalizePhone } from "@/lib/whatsapp";
import { isNiche, type BillingType, type Profile } from "@/lib/cobranca-core";
import type { ClientInput } from "@/lib/cobranca-data";

const str = (f: FormData, k: string) => String(f.get(k) ?? "").trim();

/** Lê o formulário de cadastro. Devolve o texto do erro ou os dados prontos. */
export function parseClient(form: FormData): ClientInput | string {
  const name = str(form, "name");
  const phone = normalizePhone(str(form, "phone"));
  const type = str(form, "billing_type") as BillingType;
  const amount = parseBRL(str(form, "amount"));
  if (name.length < 2) return "Digite o nome.";
  if (!phone) return "Confira o WhatsApp: use DDD e número, por exemplo (11) 98765-4321.";
  if (!["mensal", "pacote", "sessao"].includes(type)) return "Escolha o tipo de cobrança.";
  if (!amount || amount <= 0) return "Digite o valor, por exemplo 180,00.";
  const input: ClientInput = { name, phone, billingType: type, amountCents: amount, dueDay: null, packageSessions: null, notes: str(form, "notes") || null };
  if (type === "mensal") {
    const day = Number(str(form, "due_day"));
    if (!Number.isInteger(day) || day < 1 || day > 31) return "Escolha o dia do vencimento (1 a 31).";
    input.dueDay = day;
    input.startMonth = str(form, "start") === "proximo" ? addMonths(currentMonth(), 1) : currentMonth();
  }
  if (type === "pacote") {
    const n = Number(str(form, "package_sessions"));
    if (!Number.isInteger(n) || n < 1 || n > 200) return "Digite quantas sessões tem o pacote.";
    input.packageSessions = n;
    input.firstDueDate = /^\d{4}-\d{2}-\d{2}$/.test(str(form, "first_due")) ? str(form, "first_due") : today();
  }
  return input;
}

export function parseSetup(form: FormData): Profile | string {
  const niche = str(form, "niche");
  const displayName = str(form, "display_name");
  const pixKey = str(form, "pix_key");
  const city = str(form, "city");
  if (!isNiche(niche)) return "Escolha o que você faz.";
  if (displayName.length < 2) return "Digite como você quer aparecer nas mensagens.";
  if (pixKey.length < 5) return "Digite sua chave Pix (CPF, celular, e-mail ou chave aleatória).";
  if (city.length < 2) return "Digite sua cidade. Ela entra no código do Pix.";
  return { niche, displayName, pixKey, pixName: str(form, "pix_name") || displayName, city };
}
