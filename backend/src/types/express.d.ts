/**
 * O middleware `autenticar` valida o JWT e grava aqui o id do usuario logado.
 * A partir dele, controller e service sabem quem esta fazendo a requisicao sem
 * precisar receber o id pelo corpo ou pela URL - o que seria furo de seguranca.
 */
declare global {
  namespace Express {
    interface Request {
      usuarioId?: string;
    }
  }
}

export {};
