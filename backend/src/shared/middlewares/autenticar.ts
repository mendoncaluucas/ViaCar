import type { RequestHandler } from 'express';
import jwt from 'jsonwebtoken';
import { env } from '../../config/env';
import { AppError } from '../errors/app-error';

interface ConteudoToken {
  sub: string;
}

/**
 * Exige `Authorization: Bearer <token>` valido. Em caso de token ausente,
 * malformado ou expirado, responde 401 - e o frontend trata isso num
 * interceptor unico, mandando o usuario de volta para o login.
 */
export const autenticar: RequestHandler = (req, _res, next) => {
  const cabecalho = req.headers.authorization;

  if (!cabecalho?.startsWith('Bearer ')) {
    throw new AppError('NAO_AUTENTICADO', 'Token de acesso nao informado.');
  }

  const token = cabecalho.slice('Bearer '.length).trim();

  try {
    const conteudo = jwt.verify(token, env.JWT_SECRET) as ConteudoToken;
    req.usuarioId = conteudo.sub;
    next();
  } catch (erro) {
    if (erro instanceof jwt.TokenExpiredError) {
      throw new AppError('NAO_AUTENTICADO', 'Sessao expirada. Faca login novamente.');
    }
    throw new AppError('NAO_AUTENTICADO', 'Token de acesso invalido.');
  }
};

/**
 * Le o id do usuario logado. Usar sempre isto em vez de `req.usuarioId` direto:
 * a checagem garante que a rota realmente passou pelo middleware `autenticar`.
 */
export function usuarioLogado(req: { usuarioId?: string }): string {
  if (!req.usuarioId) {
    throw new AppError('NAO_AUTENTICADO', 'Rota protegida sem usuario autenticado.');
  }
  return req.usuarioId;
}
