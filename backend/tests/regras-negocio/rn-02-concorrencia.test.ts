import { describe, expect, it } from 'vitest';
import { prisma } from '../../src/config/prisma';
import * as caronaService from '../../src/modules/caronas/carona.service';
import * as reservaService from '../../src/modules/reservas/reserva.service';
import { AppError } from '../../src/shared/errors/app-error';
import { criarCarona, criarRota, criarUsuario, criarVeiculo } from '../fabricas';

/**
 * RN-02 — não existe overbooking.
 *
 * Duas pessoas clicando em "Reservar" na última vaga ao mesmo tempo passam as
 * duas por um `if (confirmadas < vagas)` ingênuo: ambas leem o mesmo número
 * antes de qualquer uma gravar.
 *
 * O que estes testes verificam é o mecanismo que o D4 vai usar, montado aqui
 * exatamente como ele será usado lá: transação interativa, carona travada com
 * FOR UPDATE, contagem e gravação dentro do lock.
 */
async function reservarComTrava(caronaId: string, passageiroId: string): Promise<void> {
  await prisma.$transaction(async (tx) => {
    const carona = await caronaService.travarCaronaParaAtualizacao(tx, caronaId);
    const confirmadas = await caronaService.contarReservasConfirmadas(caronaId, tx);

    if (confirmadas >= carona.vagasOfertadas) {
      throw new AppError('REGRA_NEGOCIO', 'Não há mais vagas nesta carona.');
    }

    await tx.reserva.create({ data: { caronaId, passageiroId } });
  });
}

async function caronaCom(vagas: number, quantosPassageiros: number) {
  const motorista = await criarUsuario();
  const veiculo = await criarVeiculo(motorista.id, { capacidadePassageiros: 8 });
  const rota = await criarRota(motorista.id);
  const carona = await criarCarona(rota, veiculo.id, { vagasOfertadas: vagas });

  const passageiros = [];
  for (let i = 0; i < quantosPassageiros; i++) {
    passageiros.push(await criarUsuario());
  }

  return { carona, passageiros };
}

describe('trava da carona contra reserva simultânea', () => {
  it('deixa apenas uma pessoa ficar com a última vaga', async () => {
    const { carona, passageiros } = await caronaCom(1, 4);

    const resultados = await Promise.allSettled(
      passageiros.map((p) => reservarComTrava(carona.id, p.id)),
    );

    const confirmadas = await caronaService.contarReservasConfirmadas(carona.id);

    expect(confirmadas).toBe(1);
    expect(resultados.filter((r) => r.status === 'fulfilled')).toHaveLength(1);
    expect(resultados.filter((r) => r.status === 'rejected')).toHaveLength(3);
  });

  it('preenche exatamente as vagas disponíveis quando há mais gente que lugar', async () => {
    const { carona, passageiros } = await caronaCom(3, 8);

    await Promise.allSettled(passageiros.map((p) => reservarComTrava(carona.id, p.id)));

    expect(await caronaService.contarReservasConfirmadas(carona.id)).toBe(3);
  });

  it('aceita todo mundo quando há vaga para todos', async () => {
    const { carona, passageiros } = await caronaCom(4, 4);

    const resultados = await Promise.allSettled(
      passageiros.map((p) => reservarComTrava(carona.id, p.id)),
    );

    expect(resultados.every((r) => r.status === 'fulfilled')).toBe(true);
    expect(await caronaService.contarReservasConfirmadas(carona.id)).toBe(4);
  });

  it('recusa com mensagem de regra de negócio, não com erro cru do banco', async () => {
    const { carona, passageiros } = await caronaCom(1, 2);
    await reservarComTrava(carona.id, passageiros[0]!.id);

    await expect(reservarComTrava(carona.id, passageiros[1]!.id)).rejects.toThrow(AppError);
  });

  it('reserva cancelada devolve a vaga para o próximo', async () => {
    const { carona, passageiros } = await caronaCom(1, 2);
    await reservarComTrava(carona.id, passageiros[0]!.id);

    await prisma.reserva.updateMany({
      where: { caronaId: carona.id, passageiroId: passageiros[0]!.id },
      data: { status: 'CANCELADA', canceladoEm: new Date() },
    });

    await reservarComTrava(carona.id, passageiros[1]!.id);

    expect(await caronaService.contarReservasConfirmadas(carona.id)).toBe(1);
  });
});

describe('carregadores aceitam cliente de transação', () => {
  /**
   * Garante que a peça de composição do D4 funciona: se `carregarCarona` usasse
   * o singleton internamente, ela enxergaria o estado de fora da transação e o
   * lock não protegeria a decisão.
   */
  it('enxerga o que foi escrito dentro da própria transação', async () => {
    const { carona, passageiros } = await caronaCom(2, 1);

    await prisma.$transaction(async (tx) => {
      await tx.reserva.create({ data: { caronaId: carona.id, passageiroId: passageiros[0]!.id } });

      // Ainda dentro da transação: a contagem já precisa refletir a gravação.
      expect(await caronaService.contarReservasConfirmadas(carona.id, tx)).toBe(1);

      const travada = await caronaService.travarCaronaParaAtualizacao(tx, carona.id);
      expect(travada.vagasOfertadas).toBe(2);
    });

    expect(await caronaService.contarReservasConfirmadas(carona.id)).toBe(1);
  });

  it('desfaz tudo quando a transação falha no meio', async () => {
    const { carona, passageiros } = await caronaCom(2, 1);

    await expect(
      prisma.$transaction(async (tx) => {
        await tx.reserva.create({ data: { caronaId: carona.id, passageiroId: passageiros[0]!.id } });
        throw new Error('falha proposital depois de gravar');
      }),
    ).rejects.toThrow();

    expect(await caronaService.contarReservasConfirmadas(carona.id)).toBe(0);
  });
});

/**
 * As duas escritas abaixo não são reservas, mas mexem na mesma linha e na mesma
 * contagem: cancelar a carona e alterar `vagasOfertadas`. Enquanto elas não
 * pegavam o lock, a RN-02 e a RN-08 tinham um furo cada uma — os dois
 * reproduzidos contra o banco antes de virarem estes testes.
 *
 * A montagem é sempre a mesma: uma transação segura o lock da carona, a operação
 * do motorista começa e fica bloqueada, e a reserva entra antes do commit.
 */
const esperar = (ms: number): Promise<void> => new Promise((r) => setTimeout(r, ms));

async function comReservaEntrandoNoMeio(
  caronaId: string,
  passageiroId: string,
  operacaoDoMotorista: () => Promise<unknown>,
): Promise<void> {
  let doMotorista: Promise<unknown> | undefined;

  await prisma.$transaction(async (tx) => {
    await caronaService.travarCaronaParaAtualizacao(tx, caronaId);

    doMotorista = operacaoDoMotorista().catch(() => undefined);
    await esperar(400);

    await tx.reserva.create({ data: { caronaId, passageiroId } });
  });

  await doMotorista;
}

describe('a carona também é travada pelas operações do motorista', () => {
  async function cenarioDoMotorista(vagas: number) {
    const motorista = await criarUsuario();
    const veiculo = await criarVeiculo(motorista.id, { capacidadePassageiros: 8 });
    const rota = await criarRota(motorista.id);
    const carona = await criarCarona(rota, veiculo.id, { vagasOfertadas: vagas });
    const passageiro = await criarUsuario();
    return { motorista, carona, passageiro };
  }

  /**
   * RN-08. Sem o lock, o `updateMany` da cascata rodava antes da reserva existir
   * e o `update` da carona só depois — o passageiro terminava CONFIRMADO numa
   * carona CANCELADA e ninguém ia buscá-lo.
   */
  it('cancelar a carona leva junto a reserva que entrou durante o cancelamento', async () => {
    const { motorista, carona, passageiro } = await cenarioDoMotorista(3);

    await comReservaEntrandoNoMeio(carona.id, passageiro.id, () =>
      caronaService.cancelar(carona.id, motorista.id),
    );

    const depois = await prisma.carona.findUniqueOrThrow({ where: { id: carona.id } });
    const reserva = await prisma.reserva.findFirstOrThrow({ where: { caronaId: carona.id } });

    expect(depois.status).toBe('CANCELADA');
    expect(reserva.status).toBe('CANCELADA');
    expect(await caronaService.contarReservasConfirmadas(carona.id)).toBe(0);
  });

  /**
   * RN-02 pela porta do motorista. Sem o lock, `atualizar` aprovava a redução
   * com a contagem antiga e a carona terminava com mais gente do que vagas.
   */
  it('reduzir as vagas não aprova com a contagem antiga', async () => {
    const { motorista, carona, passageiro } = await cenarioDoMotorista(2);
    const jaReservou = await criarUsuario();
    await reservaService.criar(jaReservou.id, carona.id, {});

    await comReservaEntrandoNoMeio(carona.id, passageiro.id, () =>
      caronaService.atualizar(carona.id, motorista.id, { vagasOfertadas: 1 }),
    );

    const depois = await prisma.carona.findUniqueOrThrow({ where: { id: carona.id } });
    const confirmadas = await caronaService.contarReservasConfirmadas(carona.id);

    expect(confirmadas).toBe(2);
    expect(depois.vagasOfertadas).toBeGreaterThanOrEqual(confirmadas);
  });
});
