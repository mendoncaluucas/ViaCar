import type { Request } from 'express';
import { AppError } from '../errors/app-error';

/**
 * Le um parametro de rota como string. No Express 5 o tipo de `req.params` admite
 * `string[]`, entao a checagem evita passar um array direto para o Prisma e receber
 * erro cru de driver em vez de uma mensagem util.
 */
export function parametroObrigatorio(req: Request, nome: string): string {
  const valor = req.params[nome];

  if (typeof valor !== 'string' || valor.trim().length === 0) {
    throw new AppError('VALIDACAO', `Parâmetro "${nome}" não informado na URL.`, nome);
  }

  return valor;
}
