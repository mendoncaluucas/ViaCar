/**
 * Campos que os middlewares do projeto acrescentam à requisição.
 */
declare global {
  namespace Express {
    interface Request {
      /**
       * Id do usuário logado, gravado pelo middleware `autenticar` após validar o JWT.
       * A partir dele, controller e service sabem quem está fazendo a requisição sem
       * precisar receber o id pelo corpo ou pela URL — o que seria furo de segurança.
       */
      usuarioId?: string;

      /**
       * Query string já validada e normalizada pelo middleware `validarQuery`.
       * Não usamos `req.query` porque no Express 5 ele é um getter: a atribuição
       * é aceita mas ignorada, e o valor normalizado se perderia em silêncio.
       */
      consulta?: unknown;
    }
  }
}

export {};
