import { Prisma, type StatusReserva } from '@prisma/client';
import {
  INCLUDE_RESUMO,
  paraPublica as caronaParaPublica,
  type CaronaPublica,
} from '../caronas/carona.mapper';

/**
 * A reserva nunca viaja sozinha: a tela "minhas reservas" precisa mostrar
 * horário, rota e motorista. Sem a carona embutida, o frontend faria uma
 * requisição por linha da lista.
 */
export const INCLUDE_RESERVA = {
  carona: { include: INCLUDE_RESUMO },
} satisfies Prisma.ReservaInclude;

export type ReservaComCarona = Prisma.ReservaGetPayload<{ include: typeof INCLUDE_RESERVA }>;

export interface ReservaPublica {
  id: string;
  caronaId: string;
  status: StatusReserva;
  pontoEmbarque: string | null;
  criadoEm: Date;
  canceladoEm: Date | null;
  carona: CaronaPublica;
}

/**
 * Único caminho pelo qual uma Reserva sai da API.
 *
 * `passageiroId` fica de fora: só o próprio passageiro lê as próprias reservas,
 * e dentro da carona quem viaja aparece em `passageiros`, com nome — id solto
 * não diz nada para quem está na tela.
 */
export function paraPublica(reserva: ReservaComCarona): ReservaPublica {
  return {
    id: reserva.id,
    caronaId: reserva.caronaId,
    status: reserva.status,
    pontoEmbarque: reserva.pontoEmbarque,
    criadoEm: reserva.criadoEm,
    canceladoEm: reserva.canceladoEm,
    carona: caronaParaPublica(reserva.carona),
  };
}
