import { Prisma, type StatusCarona } from '@prisma/client';
import { paraResumo as rotaResumo, type RotaResumo } from '../rotas/rota.mapper';
import { paraResumo as usuarioResumo, type UsuarioResumo } from '../usuarios/usuario.mapper';
import { paraResumo as veiculoResumo, type VeiculoResumo } from '../veiculos/veiculo.mapper';

/**
 * O que toda consulta de carona precisa trazer junto.
 *
 * O `_count` filtrado é o que sustenta `vagasDisponiveis`: o valor é sempre
 * derivado das reservas confirmadas, nunca de uma coluna — uma coluna
 * dessincronizaria no primeiro cancelamento.
 */
export const INCLUDE_RESUMO = {
  veiculo: true,
  rota: { include: { motorista: true } },
  _count: { select: { reservas: { where: { status: 'CONFIRMADA' } } } },
} satisfies Prisma.CaronaInclude;

/** O detalhe acrescenta quem já está na carona. */
export const INCLUDE_DETALHE = {
  ...INCLUDE_RESUMO,
  reservas: {
    where: { status: 'CONFIRMADA' },
    select: { pontoEmbarque: true, passageiro: { select: { id: true, nome: true, bairro: true } } },
    orderBy: { criadoEm: 'asc' },
  },
} satisfies Prisma.CaronaInclude;

export type CaronaComResumo = Prisma.CaronaGetPayload<{ include: typeof INCLUDE_RESUMO }>;
export type CaronaComDetalhe = Prisma.CaronaGetPayload<{ include: typeof INCLUDE_DETALHE }>;

export interface PassageiroDaCarona {
  id: string;
  nome: string;
  bairro: string;
  pontoEmbarque: string | null;
}

export interface CaronaPublica {
  id: string;
  dataPartida: Date;
  vagasOfertadas: number;
  /** Calculado: `vagasOfertadas - reservas confirmadas`. Nunca é coluna. */
  vagasDisponiveis: number;
  status: StatusCarona;
  observacao: string | null;
  motorista: UsuarioResumo;
  veiculo: VeiculoResumo;
  rota: RotaResumo;
  criadoEm: Date;
}

export interface CaronaDetalhada extends CaronaPublica {
  passageiros: PassageiroDaCarona[];
}

export function paraPublica(carona: CaronaComResumo): CaronaPublica {
  return {
    id: carona.id,
    dataPartida: carona.dataPartida,
    vagasOfertadas: carona.vagasOfertadas,
    vagasDisponiveis: carona.vagasOfertadas - carona._count.reservas,
    status: carona.status,
    observacao: carona.observacao,
    motorista: usuarioResumo(carona.rota.motorista),
    veiculo: veiculoResumo(carona.veiculo),
    rota: rotaResumo(carona.rota),
    criadoEm: carona.criadoEm,
  };
}

export function paraDetalhada(carona: CaronaComDetalhe): CaronaDetalhada {
  return {
    ...paraPublica(carona),
    passageiros: carona.reservas.map((reserva) => ({
      id: reserva.passageiro.id,
      nome: reserva.passageiro.nome,
      bairro: reserva.passageiro.bairro,
      pontoEmbarque: reserva.pontoEmbarque,
    })),
  };
}
