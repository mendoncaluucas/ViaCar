import { compare, hash } from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { env } from '../../config/env';
import { prisma } from '../../config/prisma';
import { AppError } from '../../shared/errors/app-error';
import { paraPublico, type UsuarioPublico } from '../usuarios/usuario.mapper';
import type { LoginDTO, RegistrarDTO } from './auth.schema';

const CUSTO_HASH = 10;

export interface RespostaAutenticacao {
  token: string;
  usuario: UsuarioPublico;
}

function gerarToken(usuarioId: string): string {
  return jwt.sign({}, env.JWT_SECRET, {
    subject: usuarioId,
    expiresIn: env.JWT_EXPIRES_IN as jwt.SignOptions['expiresIn'],
  });
}

export async function registrar(dados: RegistrarDTO): Promise<RespostaAutenticacao> {
  const email = dados.email.toLowerCase();

  // Checagem antecipada para devolver mensagem util apontando o campo certo.
  // Se duas requisicoes simultaneas passarem por aqui, o unique do banco barra a
  // segunda e o `traduzirErroDoBanco` a transforma em 409 - nao em 500.
  const conflito = await prisma.usuario.findFirst({
    where: { OR: [{ email }, { matricula: dados.matricula }] },
    select: { email: true },
  });

  if (conflito) {
    if (conflito.email === email) {
      throw new AppError('CONFLITO', 'Ja existe um funcionario cadastrado com este e-mail.', 'email');
    }
    throw new AppError('CONFLITO', 'Ja existe um funcionario com esta matricula.', 'matricula');
  }

  const usuario = await prisma.usuario.create({
    data: {
      nome: dados.nome,
      email,
      senhaHash: await hash(dados.senha, CUSTO_HASH),
      matricula: dados.matricula,
      telefone: dados.telefone ?? null,
      bairro: dados.bairro,
    },
  });

  return { token: gerarToken(usuario.id), usuario: paraPublico(usuario) };
}

export async function login(dados: LoginDTO): Promise<RespostaAutenticacao> {
  const email = dados.email.toLowerCase();
  const usuario = await prisma.usuario.findUnique({ where: { email } });

  // Mensagem identica para e-mail inexistente e senha errada, de proposito:
  // responder "e-mail nao encontrado" entrega a lista de funcionarios da empresa.
  if (!usuario || !(await compare(dados.senha, usuario.senhaHash))) {
    throw new AppError('NAO_AUTENTICADO', 'E-mail ou senha incorretos.');
  }

  if (!usuario.ativo) {
    throw new AppError('SEM_PERMISSAO', 'Este cadastro esta inativo. Procure o RH.');
  }

  return { token: gerarToken(usuario.id), usuario: paraPublico(usuario) };
}
