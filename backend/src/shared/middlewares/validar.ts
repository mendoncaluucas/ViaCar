import type { Request, RequestHandler } from 'express';
import type { ZodType } from 'zod';

/**
 * Valida e normaliza o corpo da requisição antes de chegar no controller.
 * O ZodError levantado aqui é traduzido para HTTP 400 pelo `tratarErros`,
 * apontando qual campo falhou.
 */
export function validarCorpo(esquema: ZodType): RequestHandler {
  return (req, _res, next) => {
    req.body = esquema.parse(req.body);
    next();
  };
}

/**
 * Valida a query string. O resultado vai para `req.consulta`, não para `req.query`.
 *
 * Motivo: no Express 5 `req.query` é um getter. Atribuir nele não lança erro —
 * e também não tem efeito. O valor normalizado pelo Zod (números convertidos,
 * datas parseadas, defaults aplicados) seria descartado em silêncio e o controller
 * continuaria lendo as strings cruas.
 */
export function validarQuery(esquema: ZodType): RequestHandler {
  return (req, _res, next) => {
    req.consulta = esquema.parse(req.query);
    next();
  };
}

/**
 * Lê a query já validada. A checagem transforma erro de fiação de rota
 * (esquecer o `validarQuery`) em falha visível no log, em vez de `undefined`
 * se espalhando silenciosamente pelo service.
 */
export function consultaValidada<T>(req: Request): T {
  if (req.consulta === undefined) {
    throw new Error('Rota leu a consulta sem passar pelo middleware validarQuery.');
  }
  return req.consulta as T;
}
