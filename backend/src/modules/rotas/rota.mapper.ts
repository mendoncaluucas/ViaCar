import type { Rota, Sentido } from '@prisma/client';
import { horaParaTexto } from '../../shared/utils/horario';

export interface RotaPublica {
  id: string;
  apelido: string;
  origemEndereco: string;
  origemBairro: string;
  destinoEndereco: string;
  destinoBairro: string;
  /** "HH:mm". No banco é TIME; a conversão acontece aqui. */
  horarioPartida: string;
  sentido: Sentido;
  /** 1 = segunda ... 7 = domingo. */
  diasSemana: number[];
  ativa: boolean;
  criadoEm: Date;
}

/** Versão reduzida, para aparecer embutida dentro de uma carona. */
export interface RotaResumo {
  apelido: string;
  origemEndereco: string;
  origemBairro: string;
  destinoEndereco: string;
  destinoBairro: string;
  horarioPartida: string;
  sentido: Sentido;
}

/**
 * Único caminho pelo qual uma Rota sai da API.
 *
 * A responsabilidade central aqui é converter `horarioPartida` de TIME para
 * "HH:mm". Sem isso o frontend receberia `1970-01-01T07:30:00.000Z` e, ao
 * formatar, exibiria o horário deslocado pelo fuso.
 */
export function paraPublica(rota: Rota): RotaPublica {
  return {
    id: rota.id,
    apelido: rota.apelido,
    origemEndereco: rota.origemEndereco,
    origemBairro: rota.origemBairro,
    destinoEndereco: rota.destinoEndereco,
    destinoBairro: rota.destinoBairro,
    horarioPartida: horaParaTexto(rota.horarioPartida),
    sentido: rota.sentido,
    diasSemana: rota.diasSemana,
    ativa: rota.ativa,
    criadoEm: rota.criadoEm,
  };
}

export function paraResumo(
  rota: Pick<
    Rota,
    | 'apelido'
    | 'origemEndereco'
    | 'origemBairro'
    | 'destinoEndereco'
    | 'destinoBairro'
    | 'horarioPartida'
    | 'sentido'
  >,
): RotaResumo {
  return {
    apelido: rota.apelido,
    origemEndereco: rota.origemEndereco,
    origemBairro: rota.origemBairro,
    destinoEndereco: rota.destinoEndereco,
    destinoBairro: rota.destinoBairro,
    horarioPartida: horaParaTexto(rota.horarioPartida),
    sentido: rota.sentido,
  };
}
