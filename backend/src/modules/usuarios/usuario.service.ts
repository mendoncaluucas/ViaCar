import { prisma } from '../../config/prisma';
import { AppError } from '../../shared/errors/app-error';
import { paraPublico, type UsuarioPublico } from './usuario.mapper';
import type { AtualizarPerfilDTO } from './usuario.schema';

export async function buscarPerfil(usuarioId: string): Promise<UsuarioPublico> {
  const usuario = await prisma.usuario.findUnique({ where: { id: usuarioId } });

  if (!usuario) {
    throw new AppError('NAO_ENCONTRADO', 'Funcionario nao encontrado.');
  }

  return paraPublico(usuario);
}

export async function atualizarPerfil(
  usuarioId: string,
  dados: AtualizarPerfilDTO,
): Promise<UsuarioPublico> {
  const usuario = await prisma.usuario.update({
    where: { id: usuarioId },
    data: {
      ...(dados.telefone !== undefined && { telefone: dados.telefone }),
      ...(dados.bairro !== undefined && { bairro: dados.bairro }),
    },
  });

  return paraPublico(usuario);
}
