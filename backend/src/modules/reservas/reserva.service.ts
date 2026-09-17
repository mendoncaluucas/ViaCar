import { StatusCarona, StatusReserva } from '@prisma/client';
import { prisma, type ClientePrisma } from '../../config/prisma';
import { AppError } from '../../shared/errors/app-error';
import { diaLocalDe, formatarInstante, intervaloDoDia } from '../../shared/utils/horario';
import {
  paraPublica as caronaParaPublica,
  type CaronaComResumo,
  type CaronaPublica,
} from '../caronas/carona.mapper';
import {
  carregarCarona,
  contarReservasConfirmadas,
  statusPelaLotacao,
  travarCaronaParaAtualizacao,
} from '../caronas/carona.service';
import { INCLUDE_RESERVA, paraPublica, type ReservaPublica } from './reserva.mapper';
import type { CriarReservaDTO } from './reserva.schema';

/** Status em texto corrido, para caber numa frase: EM_ANDAMENTO -> "em andamento". */
function porExtenso(status: StatusCarona | StatusReserva): string {
  return status.toLowerCase().replace(/_/g, ' ');
}

/**
 * RN-04 e RN-05 — quem pode entrar nesta carona.
 *
 * Roda sempre com a carona já travada: o status é justamente o que uma reserva
 * concorrente pode estar mudando neste instante.
 */
function validarCaronaReservavel(carona: CaronaComResumo, passageiroId: string): void {
  // RN-04. O motorista já vai no carro; reservar a própria vaga tiraria um
  // lugar de quem a busca existe para atender.
  if (carona.rota.motoristaId === passageiroId) {
    throw new AppError(
      'REGRA_NEGOCIO',
      'Você é o motorista desta carona. As vagas são para os colegas que vão com você.',
    );
  }

  // RN-05.
  if (carona.status === StatusCarona.CANCELADA) {
    throw new AppError('REGRA_NEGOCIO', 'Esta carona foi cancelada pelo motorista.');
  }

  if (carona.status === StatusCarona.LOTADA) {
    throw new AppError('CONFLITO', 'Esta carona já está lotada.');
  }

  if (carona.status !== StatusCarona.ABERTA) {
    throw new AppError(
      'REGRA_NEGOCIO',
      `Esta carona está ${porExtenso(carona.status)} e não aceita mais reservas.`,
    );
  }

  if (carona.dataPartida.getTime() <= Date.now()) {
    throw new AppError(
      'REGRA_NEGOCIO',
      `Esta carona partiu em ${formatarInstante(carona.dataPartida)} e não aceita mais reservas.`,
    );
  }
}

/**
 * O índice parcial `reserva_confirmada_unica_por_carona` já impede a duplicata no banco.
 * Esta checagem existe para o erro chegar como 409 com texto legível, em vez de
 * uma violação de constraint traduzida genericamente.
 */
async function validarSemReservaRepetida(
  tx: ClientePrisma,
  caronaId: string,
  passageiroId: string,
): Promise<void> {
  const jaReservou = await tx.reserva.findFirst({
    where: { caronaId, passageiroId, status: StatusReserva.CONFIRMADA },
    select: { id: true },
  });

  if (jaReservou) {
    throw new AppError('CONFLITO', 'Você já tem uma reserva confirmada nesta carona.');
  }
}

/**
 * RN-10 — o passageiro não pode ter duas reservas confirmadas conflitantes.
 *
 * Conflito aqui é "mesmo dia e mesmo sentido": ninguém vai duas vezes para o
 * trabalho na mesma manhã. Comparar janelas de horário seria mais fino e mais
 * frágil — dois carros saindo 07:00 e 07:40 continuam sendo uma escolha só, e o
 * segundo motorista ficaria com um lugar vazio.
 *
 * O dia é o dia-calendário no fuso da empresa, não em UTC: a carona da volta
 * às 22:00 é 01:00Z do dia seguinte e cairia no dia errado.
 */
async function validarSemConflitoDeHorario(
  tx: ClientePrisma,
  carona: CaronaComResumo,
  passageiroId: string,
): Promise<void> {
  const { inicio, fim } = intervaloDoDia(diaLocalDe(carona.dataPartida));

  const conflitante = await tx.reserva.findFirst({
    where: {
      passageiroId,
      status: StatusReserva.CONFIRMADA,
      carona: {
        status: { not: StatusCarona.CANCELADA },
        dataPartida: { gte: inicio, lt: fim },
        rota: { sentido: carona.rota.sentido },
      },
    },
    select: { carona: { select: { dataPartida: true, rota: { select: { apelido: true } } } } },
  });

  if (conflitante) {
    throw new AppError(
      'CONFLITO',
      `Você já tem reserva confirmada neste dia e no mesmo sentido: ` +
        `"${conflitante.carona.rota.apelido}", com partida em ` +
        `${formatarInstante(conflitante.carona.dataPartida)}. ` +
        `Cancele aquela reserva antes de pegar esta.`,
    );
  }
}

/**
 * RN-06 e RN-07 — reavalia o status depois de mexer na lotação.
 *
 * As duas regras são a mesma conta em direções opostas, então são a mesma
 * chamada: `statusPelaLotacao` decide, e a gravação só acontece se mudou.
 */
async function ajustarStatus(
  tx: ClientePrisma,
  carona: CaronaComResumo,
  confirmadas: number,
): Promise<void> {
  const status = statusPelaLotacao(carona.status, carona.vagasOfertadas, confirmadas);

  if (status !== carona.status) {
    await tx.carona.update({ where: { id: carona.id }, data: { status } });
  }
}

/**
 * RN-02 — reservar uma vaga sem overbooking.
 *
 * Tudo acontece dentro de uma transação, com a carona travada ANTES de qualquer
 * decisão. Medido contra o banco: sem a trava, 4 pessoas disputando 1 vaga
 * terminaram com 4 reservas confirmadas; com a trava, exatamente 1.
 */
export async function criar(
  passageiroId: string,
  caronaId: string,
  dados: CriarReservaDTO,
): Promise<ReservaPublica> {
  const reserva = await prisma.$transaction(async (tx) => {
    const carona = await travarCaronaParaAtualizacao(tx, caronaId);

    validarCaronaReservavel(carona, passageiroId);
    await validarSemReservaRepetida(tx, caronaId, passageiroId);
    await validarSemConflitoDeHorario(tx, carona, passageiroId);

    const confirmadas = await contarReservasConfirmadas(caronaId, tx);

    // Rede de segurança da RN-02: a carona está ABERTA mas não tem vaga. Só
    // recusa, sem tentar consertar o status aqui — a gravação seria desfeita
    // pelo `throw` da linha seguinte, junto com o resto da transação.
    if (confirmadas >= carona.vagasOfertadas) {
      throw new AppError('CONFLITO', 'A última vaga desta carona acabou de ser preenchida.');
    }

    const criada = await tx.reserva.create({
      data: {
        caronaId,
        passageiroId,
        pontoEmbarque: dados.pontoEmbarque ?? null,
      },
      select: { id: true },
    });

    // RN-07.
    await ajustarStatus(tx, carona, confirmadas + 1);

    // Releitura depois de gravar: a resposta precisa levar o status e as vagas
    // já atualizados, senão quem pegou a última vaga recebe uma carona
    // "ABERTA, 1 vaga" e a tela mostra o que não existe mais.
    return tx.reserva.findUniqueOrThrow({ where: { id: criada.id }, include: INCLUDE_RESERVA });
  });

  return paraPublica(reserva);
}

/**
 * RN-06 — cancelar a reserva devolve a vaga, e a carona lotada reabre.
 *
 * Devolve a carona atualizada, não a reserva: quem cancelou já sabe o que fez,
 * e o que a tela precisa saber é quantas vagas a carona tem agora.
 */
export async function cancelar(reservaId: string, passageiroId: string): Promise<CaronaPublica> {
  return prisma.$transaction(async (tx) => {
    const alvo = await tx.reserva.findUnique({
      where: { id: reservaId },
      select: { caronaId: true, passageiroId: true },
    });

    if (!alvo) {
      throw new AppError('NAO_ENCONTRADO', 'Reserva não encontrada.');
    }

    if (alvo.passageiroId !== passageiroId) {
      throw new AppError('SEM_PERMISSAO', 'Esta reserva é de outro funcionário.');
    }

    // Liberar a vaga e reabrir a carona é a mesma decisão que uma reserva
    // concorrente está tomando. As duas precisam serializar na mesma linha.
    const carona = await travarCaronaParaAtualizacao(tx, alvo.caronaId);

    // Releitura sob a trava: entre a busca acima e o lock, o motorista pode ter
    // cancelado a carona e levado esta reserva junto na cascata da RN-08.
    const reserva = await tx.reserva.findUniqueOrThrow({ where: { id: reservaId } });

    if (reserva.status === StatusReserva.CANCELADA) {
      throw new AppError('CONFLITO', 'Esta reserva já está cancelada.');
    }

    if (reserva.status !== StatusReserva.CONFIRMADA) {
      throw new AppError(
        'REGRA_NEGOCIO',
        `Esta reserva já foi encerrada como ${porExtenso(reserva.status)} e não pode ser cancelada.`,
      );
    }

    // Mesma razão que impede cancelar carona já partida: marcar como CANCELADA
    // apagaria o registro de quem de fato viajou, que é a base da pontuação
    // (N2) e da avaliação de conduta (N3). Falta é NAO_COMPARECEU, e isso é
    // decisão do motorista, não do passageiro.
    if (carona.dataPartida.getTime() <= Date.now()) {
      throw new AppError(
        'REGRA_NEGOCIO',
        `Esta carona partiu em ${formatarInstante(carona.dataPartida)} e a reserva não pode ` +
          `mais ser cancelada. Fale com o motorista.`,
      );
    }

    await tx.reserva.update({
      where: { id: reservaId },
      data: { status: StatusReserva.CANCELADA, canceladoEm: new Date() },
    });

    // RN-06 — a vaga voltou, então a carona lotada volta para a busca.
    await ajustarStatus(tx, carona, await contarReservasConfirmadas(alvo.caronaId, tx));

    return caronaParaPublica(await carregarCarona(alvo.caronaId, tx));
  });
}

/**
 * As reservas do usuário como passageiro — a contraparte de `GET /caronas/minhas`,
 * que lista o que ele oferece como motorista.
 *
 * Traz o histórico inteiro, inclusive canceladas: o passageiro precisa conferir
 * o que reservou e o que desmarcou. A ordem decrescente coloca a próxima viagem
 * no topo e empurra o passado para baixo.
 */
export async function listarDoPassageiro(passageiroId: string): Promise<ReservaPublica[]> {
  const reservas = await prisma.reserva.findMany({
    where: { passageiroId },
    include: INCLUDE_RESERVA,
    orderBy: { carona: { dataPartida: 'desc' } },
  });

  return reservas.map(paraPublica);
}
