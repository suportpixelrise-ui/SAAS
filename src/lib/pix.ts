// Gera o "Pix copia e cola" (BR Code estático, padrão EMV do Banco Central) a partir da chave do usuário.
// O dinheiro vai direto da conta do cliente para a conta do usuário: o app não toca no pagamento.

function field(id: string, value: string): string {
  return id + value.length.toString().padStart(2, "0") + value;
}

/** CRC16-CCITT (polinômio 0x1021, início 0xFFFF), exigido no campo 63 do BR Code. */
export function crc16(payload: string): string {
  let crc = 0xffff;
  for (let i = 0; i < payload.length; i++) {
    crc ^= payload.charCodeAt(i) << 8;
    for (let j = 0; j < 8; j++) {
      crc = crc & 0x8000 ? (crc << 1) ^ 0x1021 : crc << 1;
      crc &= 0xffff;
    }
  }
  return crc.toString(16).toUpperCase().padStart(4, "0");
}

/** O BR Code só aceita ASCII: tira acentos e caracteres especiais. */
function clean(text: string, max: number): string {
  return text
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^A-Za-z0-9 ]/g, "")
    .trim()
    .slice(0, max);
}

/** Normaliza a chave: telefone ganha +55, CPF/CNPJ ficam só com números, e-mail em minúsculas. */
export function normalizePixKey(raw: string): string {
  const key = raw.trim();
  if (key.includes("@")) return key.toLowerCase();
  if (/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(key)) return key.toLowerCase();
  if (key.startsWith("+")) return "+" + key.replace(/\D/g, "");
  const digits = key.replace(/\D/g, "");
  if (/^\d{3}\.\d{3}\.\d{3}-\d{2}$/.test(key) || /^\d{2}\.\d{3}\.\d{3}\/\d{4}-\d{2}$/.test(key)) return digits;
  if (/^\(?\d{2}\)?\s?9?\d{4}-?\d{4}$/.test(key)) return "+55" + digits;
  return digits.length >= 11 ? digits : key;
}

export interface PixInput {
  key: string;
  name: string;
  city: string;
  amountCents?: number;
  txid?: string;
}

export function pixCopiaECola({ key, name, city, amountCents, txid }: PixInput): string {
  const account = field("00", "br.gov.bcb.pix") + field("01", normalizePixKey(key));
  let payload =
    field("00", "01") +
    field("26", account) +
    field("52", "0000") +
    field("53", "986") +
    (amountCents && amountCents > 0 ? field("54", (amountCents / 100).toFixed(2)) : "") +
    field("58", "BR") +
    field("59", clean(name, 25) || "RECEBEDOR") +
    field("60", clean(city, 15) || "BRASIL") +
    field("62", field("05", (txid ?? "").replace(/[^A-Za-z0-9]/g, "").slice(0, 25) || "***"));
  payload += "6304";
  return payload + crc16(payload);
}
