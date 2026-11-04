// Dados de quem vende o serviço. Preencha aqui uma vez: os Termos e a Política usam estes campos.
// Campo vazio aparece destacado nas páginas, para não publicar sem querer.

export const EMPRESA = {
  nome: "Pixel Rise",
  cidade: "São Paulo",
};

export type CampoEmpresa = keyof typeof EMPRESA;

export const ROTULOS: Record<CampoEmpresa, string> = {
  nome: "SEU NOME COMPLETO",
  cidade: "CIDADE E ESTADO",
};

/** Suporte pelo WhatsApp. É também o canal de contato nos Termos e na Política. */
export const SUPORTE_NUMERO = "5511956020407";
export const SUPORTE_TEXTO = "(11) 95602-0407";
export const suporteLink = (mensagem: string) => `https://wa.me/${SUPORTE_NUMERO}?text=${encodeURIComponent(mensagem)}`;
export const ajudaLink = (app: string) => suporteLink(`Olá! Preciso de ajuda com o ${app}.`);

/** Data dos documentos. Mude quando o texto mudar: fica guardada na conta de quem aceitou. */
export const TERMOS_VERSAO = "2026-11-04";
