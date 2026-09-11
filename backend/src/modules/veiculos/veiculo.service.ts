import { StatusCarona, type Veiculo } from '@prisma/client';
import { prisma } from '../../config/prisma';
import { AppError } from '../../shared/errors/app-error';
import type { AtualizarVeiculoDTO, CriarVeiculoDTO } from './veiculo.schema';

const STATUS_EM_USO: StatusCarona[] = [StatusCarona.ABERTA, StatusCarona.LOTADA, StatusCarona.EM_ANDAMENTO];

async function garantirPlacaLivre(placa: string, ignorarId?: string): Promise<void> {
  const existente = await prisma.veiculo.findUnique({ where: { placa }, select: { id: true } });

  if (existente && existente.id !== ignorarId) {
    throw new AppError('CONFLITO', `Ja existe um veiculo cadastrado com a placa ${placa}.`, 'placa');
  }
}

/** Carrega o veiculo garantindo que ele pertence a quem esta pedindo. */
async function carregarDoDono(veiculoId: string, usuarioId: string): Promise<Veiculo> {
  const veiculo = await prisma.veiculo.findUnique({ where: { id: veiculoId } });

  if (!veiculo) {
    throw new AppError('NAO_ENCONTRADO', 'Veiculo nao encontrado.');
  }

  if (veiculo.usuarioId !== usuarioId) {
    throw new AppError('SEM_PERMISSAO', 'Este veiculo pertence a outro funcionario.');
  }

  return veiculo;
}

export async function criar(usuarioId: string, dados: CriarVeiculoDTO): Promise<Veiculo> {
  await garantirPlacaLivre(dados.placa);

  return prisma.veiculo.create({
    data: { ...dados, usuarioId },
  });
}

export async function listarDoUsuario(usuarioId: string): Promise<Veiculo[]> {
  return prisma.veiculo.findMany({
    where: { usuarioId, ativo: true },
    orderBy: { criadoEm: 'asc' },
  });
}

export async function buscarPorId(veiculoId: string, usuarioId: string): Promise<Veiculo> {
  return carregarDoDono(veiculoId, usuarioId);
}

export async function atualizar(
  veiculoId: string,
  usuarioId: string,
  dados: AtualizarVeiculoDTO,
): Promise<Veiculo> {
  const veiculo = await carregarDoDono(veiculoId, usuarioId);

  if (dados.placa && dados.placa !== veiculo.placa) {
    await garantirPlacaLivre(dados.placa, veiculoId);
  }

  // RN-01 pela porta dos fundos: baixar a capacidade nao pode deixar uma carona
  // ja publicada ofertando mais vagas do que o carro passa a comportar.
  // A trigger do banco so dispara em INSERT/UPDATE de carona, nao alcanca isto.
  if (dados.capacidadePassageiros !== undefined && dados.capacidadePassageiros < veiculo.capacidadePassageiros) {
    const conflitante = await prisma.carona.findFirst({
      where: {
        veiculoId,
        status: { in: STATUS_EM_USO },
        vagasOfertadas: { gt: dados.capacidadePassageiros },
      },
      select: { dataPartida: true, vagasOfertadas: true },
    });

    if (conflitante) {
      throw new AppError(
        'REGRA_NEGOCIO',
        `Existe uma carona em ${conflitante.dataPartida.toISOString()} ofertando ${conflitante.vagasOfertadas} vagas. ` +
          `Reduza as vagas dessa carona antes de baixar a capacidade do veiculo.`,
        'capacidadePassageiros',
      );
    }
  }

  return prisma.veiculo.update({ where: { id: veiculoId }, data: dados });
}

/**
 * Soft delete. O veiculo nunca e apagado de verdade porque as caronas passadas
 * apontam para ele - e esse historico alimenta pontuacao e avaliacao no N2/N3.
 */
export async function inativar(veiculoId: string, usuarioId: string): Promise<void> {
  await carregarDoDono(veiculoId, usuarioId);

  const emUso = await prisma.carona.findFirst({
    where: { veiculoId, status: { in: STATUS_EM_USO }, dataPartida: { gte: new Date() } },
    select: { dataPartida: true },
  });

  if (emUso) {
    throw new AppError(
      'REGRA_NEGOCIO',
      'Este veiculo tem carona agendada. Cancele a carona antes de remove-lo.',
    );
  }

  await prisma.veiculo.update({ where: { id: veiculoId }, data: { ativo: false } });
}
