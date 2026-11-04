// Dados de quem vende o serviço. Preencha aqui uma vez: os Termos e a Política usam estes campos.
// Campo vazio aparece destacado nas páginas, para não publicar sem querer.

export const EMPRESA = {
  razaoSocial: "",
  cnpj: "",
  endereco: "",
  email: "",
  cidadeForo: "",
};

export type CampoEmpresa = keyof typeof EMPRESA;

export const ROTULOS: Record<CampoEmpresa, string> = {
  razaoSocial: "RAZÃO SOCIAL",
  cnpj: "CNPJ",
  endereco: "ENDEREÇO COMPLETO",
  email: "E-MAIL DE CONTATO",
  cidadeForo: "CIDADE E ESTADO DA EMPRESA",
};

/** Data dos documentos. Mude quando o texto mudar: fica guardada na conta de quem aceitou. */
export const TERMOS_VERSAO = "2026-11-04";
