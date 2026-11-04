type Dados = Record<string, any>;
export declare function tratarAviso(event: string, data: Dados, b: {
  acharAssinatura(data: Dados): Promise<Dados | null>;
  acharConta(email: string): Promise<string | null>;
  criarConta(email: string, product: "cobranca" | "sobra"): Promise<string>;
  assinaturaDaConta(uid: string, product: "cobranca" | "sobra"): Promise<Dados | null>;
  atualizar(sub: Dados, patch: Record<string, unknown>): Promise<void>;
  devolver(pedidoId: string): Promise<unknown>;
  cancelar(assinaturaId: string): Promise<unknown>;
}): Promise<string>;
