import { describe, expect, it } from 'vitest';
import { prisma } from '../../src/config/prisma';
import { traduzirErroDoBanco } from '../../src/shared/errors/traduzir-erro-do-banco';
import { combinarDiaEHorario } from '../../src/shared/utils/horario';
import { criarCarona, criarRota, criarUsuario, criarVeiculo, emDias } from '../fabricas';

/**
 * RN-01 (crítica, enunciada no case):
 * o motorista não pode oferecer mais vagas do que a capacidade do seu veículo.
 *
 * A regra cruza duas tabelas, então não é um CHECK — é a trigger
 * `carona_valida_capacidade`. Estes testes atacam o banco diretamente, sem
 * passar pela validação da aplicação, que é o ponto: a regra precisa valer
 * mesmo para escrita vinda de seed, script ou console.
 */
describe('RN-01 — vagas ofertadas não passam da capacidade do veículo', () => {
  async function cenario(capacidade: number) {
    const motorista = await criarUsuario();
    const veiculo = await criarVeiculo(motorista.id, { capacidadePassageiros: capacidade });
    const rota = await criarRota(motorista.id);
    return { motorista, veiculo, rota };
  }

  it('aceita ofertar exatamente a capacidade do veículo', async () => {
    const { veiculo, rota } = await cenario(4);

    const carona = await criarCarona(rota, veiculo.id, { vagasOfertadas: 4 });

    expect(carona.vagasOfertadas).toBe(4);
  });

  it('barra a criação com mais vagas do que o carro comporta', async () => {
    const { veiculo, rota } = await cenario(4);

    await expect(criarCarona(rota, veiculo.id, { vagasOfertadas: 6 })).rejects.toThrow();
  });

  it('barra também o UPDATE que sobe as vagas além da capacidade', async () => {
    const { veiculo, rota } = await cenario(4);
    const carona = await criarCarona(rota, veiculo.id, { vagasOfertadas: 3 });

    await expect(
      prisma.carona.update({ where: { id: carona.id }, data: { vagasOfertadas: 7 } }),
    ).rejects.toThrow();
  });

  it('barra a troca para um veículo menor mantendo as vagas', async () => {
    const { motorista, veiculo, rota } = await cenario(4);
    const carona = await criarCarona(rota, veiculo.id, { vagasOfertadas: 4 });
    const menor = await criarVeiculo(motorista.id, { capacidadePassageiros: 2 });

    await expect(
      prisma.carona.update({ where: { id: carona.id }, data: { veiculoId: menor.id } }),
    ).rejects.toThrow();
  });

  it('a mensagem da trigger chega ao usuário como 422, não como 500', async () => {
    const { veiculo, rota } = await cenario(4);

    try {
      await criarCarona(rota, veiculo.id, { vagasOfertadas: 6 });
      expect.unreachable('a trigger deveria ter barrado');
    } catch (erro) {
      const traduzido = traduzirErroDoBanco(erro);

      expect(traduzido).not.toBeNull();
      expect(traduzido?.status).toBe(422);
      expect(traduzido?.codigo).toBe('REGRA_NEGOCIO');
      expect(traduzido?.message).toContain('comporta 4 passageiros');
      expect(traduzido?.message).toContain('6 vagas');
    }
  });
});

describe('constraints de sanidade do domínio', () => {
  it('recusa veículo com capacidade fora da faixa de 1 a 8', async () => {
    const dono = await criarUsuario();

    await expect(criarVeiculo(dono.id, { capacidadePassageiros: 9 })).rejects.toThrow();
    await expect(criarVeiculo(dono.id, { capacidadePassageiros: 0 })).rejects.toThrow();
  });

  it('recusa rota com dia da semana fora de 1 a 7', async () => {
    const motorista = await criarUsuario();

    await expect(criarRota(motorista.id, { diasSemana: [1, 9] })).rejects.toThrow();
    await expect(criarRota(motorista.id, { diasSemana: [] })).rejects.toThrow();
  });

  it('recusa carona com zero vagas', async () => {
    const motorista = await criarUsuario();
    const veiculo = await criarVeiculo(motorista.id);
    const rota = await criarRota(motorista.id);

    await expect(criarCarona(rota, veiculo.id, { vagasOfertadas: 0 })).rejects.toThrow();
  });

  it('recusa duas caronas da mesma rota no mesmo instante de partida', async () => {
    const motorista = await criarUsuario();
    const veiculo = await criarVeiculo(motorista.id);
    const rota = await criarRota(motorista.id);
    const dia = emDias(2);

    await criarCarona(rota, veiculo.id, { dia });

    await expect(criarCarona(rota, veiculo.id, { dia })).rejects.toThrow();
  });

  /**
   * Contraparte da armadilha 3.1: a constraint compara o timestamp inteiro.
   * É `combinarDiaEHorario` que faz duas requisições do mesmo dia colidirem —
   * por isso `data_partida` nunca pode vir crua do cliente.
   */
  it('a proteção depende de combinarDiaEHorario, não da constraint sozinha', async () => {
    const motorista = await criarUsuario();
    const veiculo = await criarVeiculo(motorista.id);
    const rota = await criarRota(motorista.id);
    const dia = emDias(3);

    const instante = combinarDiaEHorario(dia, rota.horarioPartida);
    await prisma.carona.create({
      data: { rotaId: rota.id, veiculoId: veiculo.id, dataPartida: instante, vagasOfertadas: 2 },
    });

    // Um milissegundo de diferença passa pelo índice único.
    const quaseIgual = new Date(instante.getTime() + 1);
    const gemea = await prisma.carona.create({
      data: { rotaId: rota.id, veiculoId: veiculo.id, dataPartida: quaseIgual, vagasOfertadas: 2 },
    });

    expect(gemea.id).toBeDefined();

    // Já pelo helper, o mesmo dia sempre gera o mesmo instante — e aí colide.
    await expect(
      prisma.carona.create({
        data: {
          rotaId: rota.id,
          veiculoId: veiculo.id,
          dataPartida: combinarDiaEHorario(dia, rota.horarioPartida),
          vagasOfertadas: 2,
        },
      }),
    ).rejects.toThrow();
  });
});

describe('índice parcial de reserva confirmada', () => {
  async function caronaComPassageiro() {
    const motorista = await criarUsuario();
    const passageiro = await criarUsuario();
    const veiculo = await criarVeiculo(motorista.id);
    const rota = await criarRota(motorista.id);
    const carona = await criarCarona(rota, veiculo.id);
    return { carona, passageiro };
  }

  it('impede o mesmo passageiro de confirmar duas vezes na mesma carona', async () => {
    const { carona, passageiro } = await caronaComPassageiro();
    await prisma.reserva.create({ data: { caronaId: carona.id, passageiroId: passageiro.id } });

    await expect(
      prisma.reserva.create({ data: { caronaId: carona.id, passageiroId: passageiro.id } }),
    ).rejects.toThrow();
  });

  it('permite reservar de novo depois de cancelar, porque o índice é parcial', async () => {
    const { carona, passageiro } = await caronaComPassageiro();
    const primeira = await prisma.reserva.create({
      data: { caronaId: carona.id, passageiroId: passageiro.id },
    });

    await prisma.reserva.update({
      where: { id: primeira.id },
      data: { status: 'CANCELADA', canceladoEm: new Date() },
    });

    const segunda = await prisma.reserva.create({
      data: { caronaId: carona.id, passageiroId: passageiro.id },
    });

    expect(segunda.id).not.toBe(primeira.id);
    expect(segunda.status).toBe('CONFIRMADA');
  });
});

describe('proteção do histórico', () => {
  it('recusa apagar usuário que já tem reserva', async () => {
    const motorista = await criarUsuario();
    const passageiro = await criarUsuario();
    const veiculo = await criarVeiculo(motorista.id);
    const rota = await criarRota(motorista.id);
    const carona = await criarCarona(rota, veiculo.id);
    await prisma.reserva.create({ data: { caronaId: carona.id, passageiroId: passageiro.id } });

    try {
      await prisma.usuario.delete({ where: { id: passageiro.id } });
      expect.unreachable('o histórico deveria ter bloqueado a exclusão');
    } catch (erro) {
      const traduzido = traduzirErroDoBanco(erro);
      expect(traduzido?.status).toBe(409);
    }
  });
});
