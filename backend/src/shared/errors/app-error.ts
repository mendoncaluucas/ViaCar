/**
 * Codigos de erro do contrato da API. O status HTTP e derivado do codigo, entao
 * nao tem como a resposta divergir do que foi combinado com o frontend.
 */
export type CodigoErro =
  | 'VALIDACAO'
  | 'NAO_AUTENTICADO'
  | 'SEM_PERMISSAO'
  | 'NAO_ENCONTRADO'
  | 'CONFLITO'
  | 'REGRA_NEGOCIO';

const statusPorCodigo: Record<CodigoErro, number> = {
  VALIDACAO: 400,
  NAO_AUTENTICADO: 401,
  SEM_PERMISSAO: 403,
  NAO_ENCONTRADO: 404,
  CONFLITO: 409,
  REGRA_NEGOCIO: 422,
};

export class AppError extends Error {
  public readonly codigo: CodigoErro;
  public readonly status: number;
  public readonly campo: string | undefined;

  /**
   * @param mensagem Texto em portugues, pronto para o usuario final ler na tela.
   * @param campo Nome do campo do payload que causou o erro, quando aplicavel.
   */
  constructor(codigo: CodigoErro, mensagem: string, campo?: string) {
    super(mensagem);
    this.name = 'AppError';
    this.codigo = codigo;
    this.status = statusPorCodigo[codigo];
    this.campo = campo;
  }
}
