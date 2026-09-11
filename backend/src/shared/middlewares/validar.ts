import type { RequestHandler } from 'express';
import type { ZodType } from 'zod';

/**
 * Valida e normaliza o corpo da requisicao antes de chegar no controller.
 * O ZodError levantado aqui e traduzido para HTTP 400 pelo `tratarErros`,
 * apontando qual campo falhou.
 */
export function validarCorpo(esquema: ZodType): RequestHandler {
  return (req, _res, next) => {
    req.body = esquema.parse(req.body);
    next();
  };
}
