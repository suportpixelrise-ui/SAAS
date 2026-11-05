type Dados = Record<string, any>;
export declare function idDaAssinatura(data: Dados): string | null;
export declare function origemValida(args: {
  segredo: string;
  timestamp: string | null;
  assinatura: string | null;
  corpo: string;
  secretDoCorpo?: string;
  agora?: number;
}): Promise<boolean>;
export declare function normalizarEmail(valor: unknown): string | null;
export declare function produtoDoAviso(data: Dados): "cobranca" | "sobra" | null;
export declare function pagamentoDuplicado(event: string, data: Dados, sub: Dados, agora?: number): boolean;
export declare function mudancaDoEvento(event: string, data: Dados, sub: Dados, agora?: number): Record<string, unknown> | null;
export declare function cicloDoAviso(data: unknown): "mensal" | "anual" | null;
