import { StatusCarona, StatusReserva } from '@prisma/client';
import { describe, expect, it } from 'vitest';
import { prisma } from '../../src/config/prisma';
import * as caronaService from '../../src/modules/caronas/carona.service';
import * as reservaService from '../../src/modules/reservas/reserva.service';
import { AppError } from '../../src/shared/errors/app-error';
import { criarCarona, criarRota, criarUsuario, criarVeiculo, emDias } from '../fabricas';

async function capturarErro(acao: () => Promise<unknown>): Promise<AppError> {
  try {
    await acao();
  } catch (erro) {
    if (erro instanceof AppError) return erro;
    throw erro;
  }
  throw new Error('Esperava um AppError, mas a operação foi concluída com sucesso.');
}

/** Uma carona pronta para receber passageiros, com o motorista e um colega. */
async function cenario(vagas = 3, extras: { dia?: Date } = {}) {
  const motorista = await criarUsuario();
  const veiculo = await criarVeiculo(motorista.id, { capacidadePassageiros: 4 });
  const rota = await criarRota(motorista.id);
  const carona = await criarCarona(rota, veiculo.id, { vagasOfertadas: vagas, ...extras });
  const passageiro = await criarUsuario();

  return { motorista, veiculo, rota, carona, passageiro };
}

describe('reservar uma vaga', () => {
  it('confirma a reserva e desconta a vaga da carona', async () => {
    const { carona, passageiro } = await cenario(3);

    const reserva = await reservaService.criar(passageiro.id, carona.id, {
      pontoEmbarque: 'Esquina da Calógeras com a Blumenau',
    });

    expect(reserva.status).toBe(StatusReserva.CONFIRMADA);
    expect(reserva.pontoEmbarque).toBe('Esquina da Calógeras com a Blumenau');
    expect(reserva.caronaId).toBe(carona.id);
    expect(reserva.carona.vagasDisponiveis).toBe(2);
    expect(reserva.carona.status).toBe(StatusCarona.ABERTA);
  });

  it('aceita reserva sem ponto de embarque', async () => {
    const { carona, passageiro } = await cenario(3);

    const reserva = await reservaService.criar(passageiro.id, carona.id, {});

    expect(reserva.pontoEmbarque).toBeNull();
  });

  it('devolve a carona com motorista e rota, para a tela não precisar de outra chamada', async () => {
    const { carona, passageiro, motorista, rota } = await cenario(3);

    const reserva = await reservaService.criar(passageiro.id, carona.id, {});

    expect(reserva.carona.motorista.nome).toBe(motorista.nome);
    expect(reserva.carona.rota.apelido).toBe(rota.apelido);
    expect(reserva.carona.rota.horarioPartida).toBe('07:30');
  });

  it('recusa carona inexistente com 404', async () => {
    const passageiro = await criarUsuario();

    const erro = await capturarErro(() =>
      reservaService.criar(passageiro.id, '00000000-0000-0000-0000-000000000000', {}),
    );

    expect(erro.status).toBe(404);
  });
});

describe('RN-04 — motorista não reserva na própria carona', () => {
  it('recusa com 422 e diz o porquê', async () => {
    const { carona, motorista } = await cenario(3);

    const erro = await capturarErro(() => reservaService.criar(motorista.id, carona.id, {}));

    expect(erro.status).toBe(422);
    expect(erro.message).toContain('Você é o motorista desta carona');
  });
});

describe('RN-05 — só carona aberta e futura aceita reserva', () => {
  it('recusa carona cancelada', async () => {
    const { carona, passageiro } = await cenario(3);
    await prisma.carona.update({
      where: { id: carona.id },
      data: { status: StatusCarona.CANCELADA },
    });

    const erro = await capturarErro(() => reservaService.criar(passageiro.id, carona.id, {}));

    expect(erro.status).toBe(422);
    expect(erro.message).toContain('cancelada pelo motorista');
  });

  it('recusa carona lotada com 409', async () => {
    const { carona, passageiro } = await cenario(3);
    await prisma.carona.update({ where: { id: carona.id }, data: { status: StatusCarona.LOTADA } });

    const erro = await capturarErro(() => reservaService.criar(passageiro.id, carona.id, {}));

    expect(erro.status).toBe(409);
    expect(erro.message).toContain('lotada');
  });

  it('recusa carona em andamento ou concluída', async () => {
    const { carona, passageiro } = await cenario(3);

    for (const status of [StatusCarona.EM_ANDAMENTO, StatusCarona.CONCLUIDA]) {
      await prisma.carona.update({ where: { id: carona.id }, data: { status } });
      const erro = await capturarErro(() => reservaService.criar(passageiro.id, carona.id, {}));
      expect(erro.status).toBe(422);
    }
  });

  it('recusa carona que já partiu, dizendo quando foi', async () => {
    const { carona, passageiro } = await cenario(3, { dia: emDias(-1) });

    const erro = await capturarErro(() => reservaService.criar(passageiro.id, carona.id, {}));

    expect(erro.status).toBe(422);
    expect(erro.message).toContain('partiu em');
  });
});

describe('reserva repetida na mesma carona', () => {
  it('recusa a segunda com 409, antes de bater na constraint', async () => {
    const { carona, passageiro } = await cenario(3);
    await reservaService.criar(passageiro.id, carona.id, {});

    const erro = await capturarErro(() => reservaService.criar(passageiro.id, carona.id, {}));

    expect(erro.status).toBe(409);
    expect(erro.message).toContain('já tem uma reserva confirmada nesta carona');
  });

  it('libera a mesma carona de novo depois do cancelamento', async () => {
    const { carona, passageiro } = await cenario(3);
    const primeira = await reservaService.criar(passageiro.id, carona.id, {});
    await reservaService.cancelar(primeira.id, passageiro.id);

    const segunda = await reservaService.criar(passageiro.id, carona.id, {});

    expect(segunda.id).not.toBe(primeira.id);
    expect(segunda.carona.vagasDisponiveis).toBe(2);
  });
});

describe('RN-02 — sem overbooking, pela porta da frente', () => {
  async function passageiros(quantos: number) {
    const lista = [];
    for (let i = 0; i < quantos; i++) {
      lista.push(await criarUsuario());
    }
    return lista;
  }

  it('deixa só uma pessoa ficar com a última vaga, com 4 clicando junto', async () => {
    const { carona } = await cenario(1);
    const disputantes = await passageiros(4);

    const resultados = await Promise.allSettled(
      disputantes.map((p) => reservaService.criar(p.id, carona.id, {})),
    );

    expect(resultados.filter((r) => r.status === 'fulfilled')).toHaveLength(1);
    expect(await caronaService.contarReservasConfirmadas(carona.id)).toBe(1);
  });

  it('preenche exatamente as vagas quando há mais gente do que lugar', async () => {
    const { carona } = await cenario(3);
    const disputantes = await passageiros(8);

    await Promise.allSettled(disputantes.map((p) => reservaService.criar(p.id, carona.id, {})));

    expect(await caronaService.contarReservasConfirmadas(carona.id)).toBe(3);
  });

  it('quem perdeu a disputa recebe regra de negócio, não erro cru do banco', async () => {
    const { carona } = await cenario(1);
    const disputantes = await passageiros(3);

    const resultados = await Promise.allSettled(
      disputantes.map((p) => reservaService.criar(p.id, carona.id, {})),
    );

    const recusados = resultados.filter((r) => r.status === 'rejected');
    expect(recusados).toHaveLength(2);
    for (const recusado of recusados) {
      expect((recusado as PromiseRejectedResult).reason).toBeInstanceOf(AppError);
    }
  });
});

describe('RN-07 — a carona fecha sozinha ao encher', () => {
  it('vira LOTADA quando a última vaga é preenchida', async () => {
    const { carona } = await cenario(2);
    const um = await criarUsuario();
    const dois = await criarUsuario();

    const primeira = await reservaService.criar(um.id, carona.id, {});
    expect(primeira.carona.status).toBe(StatusCarona.ABERTA);

    const segunda = await reservaService.criar(dois.id, carona.id, {});

    expect(segunda.carona.status).toBe(StatusCarona.LOTADA);
    expect(segunda.carona.vagasDisponiveis).toBe(0);
  });

  it('some da busca depois de lotar', async () => {
    const { carona, rota } = await cenario(1);
    const passageiro = await criarUsuario();
    const outro = await criarUsuario();

    expect(await caronaService.buscar(outro.id, { bairroOrigem: rota.origemBairro })).toHaveLength(
      1,
    );

    await reservaService.criar(passageiro.id, carona.id, {});

    expect(await caronaService.buscar(outro.id, { bairroOrigem: rota.origemBairro })).toHaveLength(
      0,
    );
  });
});

describe('RN-06 — cancelar reserva devolve a vaga', () => {
  it('reabre a carona lotada e devolve a carona atualizada', async () => {
    const { carona } = await cenario(1);
    const passageiro = await criarUsuario();
    const reserva = await reservaService.criar(passageiro.id, carona.id, {});
    expect(reserva.carona.status).toBe(StatusCarona.LOTADA);

    const atualizada = await reservaService.cancelar(reserva.id, passageiro.id);

    expect(atualizada.status).toBe(StatusCarona.ABERTA);
    expect(atualizada.vagasDisponiveis).toBe(1);
    expect(atualizada.id).toBe(carona.id);
  });

  it('marca a reserva como cancelada e registra quando', async () => {
    const { carona, passageiro } = await cenario(3);
    const reserva = await reservaService.criar(passageiro.id, carona.id, {});

    await reservaService.cancelar(reserva.id, passageiro.id);

    const noBanco = await prisma.reserva.findUniqueOrThrow({ where: { id: reserva.id } });
    expect(noBanco.status).toBe(StatusReserva.CANCELADA);
    expect(noBanco.canceladoEm).toBeInstanceOf(Date);
  });

  it('a vaga liberada volta a ser reservável por outra pessoa', async () => {
    const { carona } = await cenario(1);
    const primeiro = await criarUsuario();
    const segundo = await criarUsuario();

    const reserva = await reservaService.criar(primeiro.id, carona.id, {});
    const recusa = await capturarErro(() => reservaService.criar(segundo.id, carona.id, {}));
    expect(recusa.status).toBe(409);

    await reservaService.cancelar(reserva.id, primeiro.id);

    const segunda = await reservaService.criar(segundo.id, carona.id, {});
    expect(segunda.carona.status).toBe(StatusCarona.LOTADA);
  });

  it('não reabre carona que não estava lotada', async () => {
    const { carona, passageiro } = await cenario(3);
    const reserva = await reservaService.criar(passageiro.id, carona.id, {});

    const atualizada = await reservaService.cancelar(reserva.id, passageiro.id);

    expect(atualizada.status).toBe(StatusCarona.ABERTA);
    expect(atualizada.vagasDisponiveis).toBe(3);
  });
});

describe('quem pode cancelar a reserva', () => {
  it('recusa cancelamento por outro funcionário com 403', async () => {
    const { carona, passageiro } = await cenario(3);
    const intruso = await criarUsuario();
    const reserva = await reservaService.criar(passageiro.id, carona.id, {});

    const erro = await capturarErro(() => reservaService.cancelar(reserva.id, intruso.id));

    expect(erro.status).toBe(403);
    expect(await caronaService.contarReservasConfirmadas(carona.id)).toBe(1);
  });

  it('recusa reserva inexistente com 404', async () => {
    const passageiro = await criarUsuario();

    const erro = await capturarErro(() =>
      reservaService.cancelar('00000000-0000-0000-0000-000000000000', passageiro.id),
    );

    expect(erro.status).toBe(404);
  });

  it('recusa cancelar duas vezes', async () => {
    const { carona, passageiro } = await cenario(3);
    const reserva = await reservaService.criar(passageiro.id, carona.id, {});
    await reservaService.cancelar(reserva.id, passageiro.id);

    const erro = await capturarErro(() => reservaService.cancelar(reserva.id, passageiro.id));

    expect(erro.status).toBe(409);
    expect(erro.message).toContain('já está cancelada');
  });

  /**
   * Mesmo motivo do DT-20: apagar o vínculo depois da viagem destrói o registro
   * de quem de fato andou junto, que é a base da pontuação (N2) e da avaliação
   * de conduta (N3).
   */
  it('recusa cancelar reserva de carona que já partiu', async () => {
    const { carona, passageiro } = await cenario(3, { dia: emDias(-1) });
    const reserva = await prisma.reserva.create({
      data: { caronaId: carona.id, passageiroId: passageiro.id },
    });

    const erro = await capturarErro(() => reservaService.cancelar(reserva.id, passageiro.id));

    expect(erro.status).toBe(422);
    expect(erro.message).toContain('partiu em');
  });

  it('recusa cancelar reserva já encerrada como realizada', async () => {
    const { carona, passageiro } = await cenario(3);
    const reserva = await reservaService.criar(passageiro.id, carona.id, {});
    await prisma.reserva.update({
      where: { id: reserva.id },
      data: { status: StatusReserva.REALIZADA },
    });

    const erro = await capturarErro(() => reservaService.cancelar(reserva.id, passageiro.id));

    expect(erro.status).toBe(422);
    expect(erro.message).toContain('realizada');
  });
});

describe('RN-08 vista pelo passageiro', () => {
  it('cancelar a carona cancela a reserva, e o passageiro não cancela de novo', async () => {
    const { carona, passageiro, motorista } = await cenario(3);
    const reserva = await reservaService.criar(passageiro.id, carona.id, {});

    await caronaService.cancelar(carona.id, motorista.id);

    const noBanco = await prisma.reserva.findUniqueOrThrow({ where: { id: reserva.id } });
    expect(noBanco.status).toBe(StatusReserva.CANCELADA);

    const erro = await capturarErro(() => reservaService.cancelar(reserva.id, passageiro.id));
    expect(erro.status).toBe(409);
  });
});

describe('RN-10 — nada de duas caronas no mesmo dia e sentido', () => {
  /** Outro motorista, outra rota, mesmo dia — o cenário que a regra existe para pegar. */
  async function outraCarona(dia: Date, sentido: 'IDA' | 'VOLTA' = 'IDA') {
    const motorista = await criarUsuario();
    const veiculo = await criarVeiculo(motorista.id);
    const rota = await criarRota(motorista.id, { apelido: `Rota ${sentido}`, sentido });
    return criarCarona(rota, veiculo.id, { dia, vagasOfertadas: 3 });
  }

  it('recusa a segunda reserva do mesmo dia no mesmo sentido', async () => {
    const dia = emDias(2);
    const { carona, passageiro } = await cenario(3, { dia });
    const concorrente = await outraCarona(dia);

    await reservaService.criar(passageiro.id, carona.id, {});
    const erro = await capturarErro(() => reservaService.criar(passageiro.id, concorrente.id, {}));

    expect(erro.status).toBe(409);
    expect(erro.message).toContain('mesmo sentido');
  });

  it('permite a volta no mesmo dia da ida', async () => {
    const dia = emDias(2);
    const { carona, passageiro } = await cenario(3, { dia });
    const volta = await outraCarona(dia, 'VOLTA');

    await reservaService.criar(passageiro.id, carona.id, {});
    const reservaDaVolta = await reservaService.criar(passageiro.id, volta.id, {});

    expect(reservaDaVolta.status).toBe(StatusReserva.CONFIRMADA);
  });

  it('permite a mesma rota em dias diferentes', async () => {
    const { carona, passageiro } = await cenario(3, { dia: emDias(2) });
    const amanha = await outraCarona(emDias(3));

    await reservaService.criar(passageiro.id, carona.id, {});
    const segunda = await reservaService.criar(passageiro.id, amanha.id, {});

    expect(segunda.status).toBe(StatusReserva.CONFIRMADA);
  });

  it('libera o dia depois que a primeira reserva é cancelada', async () => {
    const dia = emDias(2);
    const { carona, passageiro } = await cenario(3, { dia });
    const concorrente = await outraCarona(dia);

    const primeira = await reservaService.criar(passageiro.id, carona.id, {});
    await reservaService.cancelar(primeira.id, passageiro.id);

    const segunda = await reservaService.criar(passageiro.id, concorrente.id, {});
    expect(segunda.status).toBe(StatusReserva.CONFIRMADA);
  });

  it('não confunde o dia de um passageiro com o de outro', async () => {
    const dia = emDias(2);
    const { carona, passageiro } = await cenario(3, { dia });
    const concorrente = await outraCarona(dia);
    const colega = await criarUsuario();

    await reservaService.criar(passageiro.id, carona.id, {});
    const doColega = await reservaService.criar(colega.id, concorrente.id, {});

    expect(doColega.status).toBe(StatusReserva.CONFIRMADA);
  });
});

describe('minhas reservas', () => {
  it('lista só as do próprio passageiro, com a carona embutida', async () => {
    const { carona, passageiro } = await cenario(3);
    const colega = await criarUsuario();
    await reservaService.criar(passageiro.id, carona.id, {});
    await reservaService.criar(colega.id, carona.id, {});

    const minhas = await reservaService.listarDoPassageiro(passageiro.id);

    expect(minhas).toHaveLength(1);
    expect(minhas[0]?.carona.id).toBe(carona.id);
    expect(minhas[0]?.carona.motorista.nome).toBeTruthy();
  });

  it('mantém as canceladas no histórico', async () => {
    const { carona, passageiro } = await cenario(3);
    const reserva = await reservaService.criar(passageiro.id, carona.id, {});
    await reservaService.cancelar(reserva.id, passageiro.id);

    const minhas = await reservaService.listarDoPassageiro(passageiro.id);

    expect(minhas).toHaveLength(1);
    expect(minhas[0]?.status).toBe(StatusReserva.CANCELADA);
  });

  it('devolve lista vazia para quem nunca reservou', async () => {
    const passageiro = await criarUsuario();

    expect(await reservaService.listarDoPassageiro(passageiro.id)).toEqual([]);
  });

  it('ordena da partida mais distante para a mais antiga', async () => {
    const passageiro = await criarUsuario();
    const dias = [2, 5, 3];
    for (const daqui of dias) {
      const motorista = await criarUsuario();
      const veiculo = await criarVeiculo(motorista.id);
      const rota = await criarRota(motorista.id, { sentido: daqui === 5 ? 'VOLTA' : 'IDA' });
      const carona = await criarCarona(rota, veiculo.id, { dia: emDias(daqui) });
      await reservaService.criar(passageiro.id, carona.id, {});
    }

    const minhas = await reservaService.listarDoPassageiro(passageiro.id);
    const partidas = minhas.map((r) => r.carona.dataPartida.getTime());

    expect(partidas).toEqual([...partidas].sort((a, b) => b - a));
  });
});

/**
 * `carona.status` é derivado da lotação, mas fica gravado — a busca filtra por
 * ele no banco. Reservar e cancelar não são os únicos que mexem na lotação:
 * o motorista também mexe, alterando `vagasOfertadas`.
 *
 * Os dois primeiros testes aqui reproduzem defeitos que existiam: a carona
 * ficava ABERTA com zero vaga (visível na busca, recusando todo mundo) ou presa
 * em LOTADA com vaga sobrando (invisível para sempre).
 */
describe('RN-06 e RN-07 pela porta do motorista — PATCH muda a lotação', () => {
  it('reduzir as vagas até encher fecha a carona e tira ela da busca', async () => {
    const { carona, motorista, rota } = await cenario(3);
    const um = await criarUsuario();
    const dois = await criarUsuario();
    await reservaService.criar(um.id, carona.id, {});
    await reservaService.criar(dois.id, carona.id, {});

    const atualizada = await caronaService.atualizar(carona.id, motorista.id, {
      vagasOfertadas: 2,
    });

    expect(atualizada.vagasDisponiveis).toBe(0);
    expect(atualizada.status).toBe(StatusCarona.LOTADA);

    const buscador = await criarUsuario();
    const busca = await caronaService.buscar(buscador.id, { bairroOrigem: rota.origemBairro });
    expect(busca.some((c) => c.id === carona.id)).toBe(false);
  });

  it('abrir mais uma vaga numa carona lotada devolve ela para a busca', async () => {
    const { carona, motorista, rota } = await cenario(2);
    const um = await criarUsuario();
    const dois = await criarUsuario();
    await reservaService.criar(um.id, carona.id, {});
    const cheia = await reservaService.criar(dois.id, carona.id, {});
    expect(cheia.carona.status).toBe(StatusCarona.LOTADA);

    const atualizada = await caronaService.atualizar(carona.id, motorista.id, {
      vagasOfertadas: 4,
    });

    expect(atualizada.status).toBe(StatusCarona.ABERTA);
    expect(atualizada.vagasDisponiveis).toBe(2);

    const terceiro = await criarUsuario();
    const busca = await caronaService.buscar(terceiro.id, { bairroOrigem: rota.origemBairro });
    expect(busca.some((c) => c.id === carona.id)).toBe(true);

    // E a vaga anunciada é reservável de verdade, não só visível.
    const nova = await reservaService.criar(terceiro.id, carona.id, {});
    expect(nova.status).toBe(StatusReserva.CONFIRMADA);
  });

  it('editar só a observação não mexe no status', async () => {
    const { carona, motorista } = await cenario(1);
    const passageiro = await criarUsuario();
    await reservaService.criar(passageiro.id, carona.id, {});

    const atualizada = await caronaService.atualizar(carona.id, motorista.id, {
      observacao: 'Levo até a portaria 2',
    });

    expect(atualizada.status).toBe(StatusCarona.LOTADA);
    expect(atualizada.observacao).toBe('Levo até a portaria 2');
  });

  it('continua recusando reduzir abaixo do que já foi reservado', async () => {
    const { carona, motorista } = await cenario(3);
    const um = await criarUsuario();
    const dois = await criarUsuario();
    await reservaService.criar(um.id, carona.id, {});
    await reservaService.criar(dois.id, carona.id, {});

    const erro = await capturarErro(() =>
      caronaService.atualizar(carona.id, motorista.id, { vagasOfertadas: 1 }),
    );

    expect(erro.status).toBe(422);
    expect(erro.message).toContain('2 reserva(s) confirmada(s)');
  });

  it('a rede de segurança da RN-02 recusa sem deixar a carona em estado falso', async () => {
    const { carona } = await cenario(1);
    const ocupante = await criarUsuario();
    const tardio = await criarUsuario();

    // Reserva gravada direto no banco: ocupa a vaga sem passar pela RN-07,
    // deixando a carona ABERTA e cheia ao mesmo tempo.
    await prisma.reserva.create({ data: { caronaId: carona.id, passageiroId: ocupante.id } });

    const erro = await capturarErro(() => reservaService.criar(tardio.id, carona.id, {}));
    expect(erro.status).toBe(409);

    // A recusa não pode gravar nada: tudo dentro da transação que foi desfeita.
    expect(await caronaService.contarReservasConfirmadas(carona.id)).toBe(1);
  });
});
