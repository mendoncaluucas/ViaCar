import { describe, expect, it } from 'vitest';
import { prisma } from '../../src/config/prisma';
import * as caronaService from '../../src/modules/caronas/carona.service';
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
