import { StatusCarona, type Prisma, type Veiculo } from '@prisma/client';
import { prisma } from '../../config/prisma';
import { AppError } from '../../shared/errors/app-error';
import type { AtualizarVeiculoDTO, CriarVeiculoDTO } from './veiculo.schema';

const STATUS_EM_USO: StatusCarona[] = [
  StatusCarona.ABERTA,
  StatusCarona.LOTADA,
  StatusCarona.EM_ANDAMENTO,
];

/**
 * Caronas deste veículo que ainda vão acontecer e continuam valendo.
 *
 * O recorte por data é essencial: enquanto não existir o job que move
 * `ABERTA` → `CONCLUIDA` (DT-09), caronas antigas ficam paradas em `ABERTA`
 * e travariam o veículo para sempre.
 */
function caronasFuturasEmUso(veiculoId: string): Prisma.CaronaWhereInput {
  return {
    veiculoId,
    status: { in: STATUS_EM_USO },
    dataPartida: { gte: new Date() },
  };
}

/** Carrega o veículo garantindo que ele pertence a quem está pedindo. */
async function carregarDoDono(veiculoId: string, usuarioId: string): Promise<Veiculo> {
  const veiculo = await prisma.veiculo.findUnique({ where: { id: veiculoId } });

  if (!veiculo) {
    throw new AppError('NAO_ENCONTRADO', 'Veículo não encontrado.');
  }

  if (veiculo.usuarioId !== usuarioId) {
    throw new AppError('SEM_PERMISSAO', 'Este veículo pertence a outro funcionário.');
  }

  return veiculo;
}

/**
 * Cadastra um veículo.
 *
 * Como a remoção é lógica (`ativo: false`) e a placa continua ocupando o índice
 * único, recadastrar o mesmo carro reativa o registro existente em vez de criar
 * outro. Fosse um `create` novo, o funcionário levaria 409 para sempre ao tentar
 * recadastrar o próprio carro — e o histórico de caronas ficaria dividido entre
 * dois registros do mesmo veículo.
 */
export async function criar(usuarioId: string, dados: CriarVeiculoDTO): Promise<Veiculo> {
  const existente = await prisma.veiculo.findUnique({ where: { placa: dados.placa } });

  if (!existente) {
    return prisma.veiculo.create({ data: { ...dados, usuarioId } });
  }

  if (existente.usuarioId !== usuarioId) {
    throw new AppError(
      'CONFLITO',
      `A placa ${dados.placa} já está cadastrada por outro funcionário.`,
      'placa',
    );
  }

  if (existente.ativo) {
    throw new AppError(
      'CONFLITO',
      `Você já tem um veículo cadastrado com a placa ${dados.placa}.`,
      'placa',
    );
  }

  return prisma.veiculo.update({
    where: { id: existente.id },
    data: { ...dados, ativo: true },
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
    const outro = await prisma.veiculo.findUnique({
      where: { placa: dados.placa },
      select: { id: true },
    });

    if (outro && outro.id !== veiculoId) {
      throw new AppError(
        'CONFLITO',
        `Já existe um veículo cadastrado com a placa ${dados.placa}.`,
        'placa',
      );
    }
  }

  // RN-01 pela porta dos fundos: baixar a capacidade não pode deixar uma carona
  // já publicada ofertando mais vagas do que o carro passa a comportar.
  // A trigger do banco só dispara em INSERT/UPDATE de carona, não alcança isto.
  if (
    dados.capacidadePassageiros !== undefined &&
    dados.capacidadePassageiros < veiculo.capacidadePassageiros
  ) {
    const conflitante = await prisma.carona.findFirst({
      where: {
        ...caronasFuturasEmUso(veiculoId),
        vagasOfertadas: { gt: dados.capacidadePassageiros },
      },
      select: { dataPartida: true, vagasOfertadas: true },
      orderBy: { dataPartida: 'asc' },
    });

    if (conflitante) {
      throw new AppError(
        'REGRA_NEGOCIO',
        `Existe uma carona em ${conflitante.dataPartida.toISOString()} ofertando ` +
          `${conflitante.vagasOfertadas} vagas. Reduza as vagas dessa carona antes de ` +
          `baixar a capacidade do veículo.`,
        'capacidadePassageiros',
      );
    }
  }

  return prisma.veiculo.update({ where: { id: veiculoId }, data: dados });
}

/**
 * Remoção lógica. O veículo nunca é apagado de verdade porque as caronas passadas
 * apontam para ele — e esse histórico alimenta pontuação e avaliação no N2/N3.
 */
export async function inativar(veiculoId: string, usuarioId: string): Promise<void> {
  await carregarDoDono(veiculoId, usuarioId);

  const emUso = await prisma.carona.findFirst({
    where: caronasFuturasEmUso(veiculoId),
    select: { dataPartida: true },
  });

  if (emUso) {
    throw new AppError(
      'REGRA_NEGOCIO',
      'Este veículo tem carona agendada. Cancele a carona antes de removê-lo.',
    );
  }

  await prisma.veiculo.update({ where: { id: veiculoId }, data: { ativo: false } });
}
