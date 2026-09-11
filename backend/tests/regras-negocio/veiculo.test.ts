import { describe, expect, it } from 'vitest';
import { AppError } from '../../src/shared/errors/app-error';
import * as veiculoService from '../../src/modules/veiculos/veiculo.service';
import { criarCarona, criarRota, criarUsuario, criarVeiculo, emDias } from '../fabricas';

const CIVIC = { placa: 'MHT4A21', modelo: 'Honda Civic', cor: 'Prata', capacidadePassageiros: 4 };

/** Executa e devolve o AppError lançado, falhando se nada for lançado. */
async function capturarErro(acao: () => Promise<unknown>): Promise<AppError> {
  try {
    await acao();
  } catch (erro) {
    if (erro instanceof AppError) return erro;
    throw erro;
  }
  throw new Error('Esperava um AppError, mas a operação foi concluída com sucesso.');
}

describe('cadastro de veículo', () => {
  it('cadastra normalmente quando a placa está livre', async () => {
    const dono = await criarUsuario();

    const veiculo = await veiculoService.criar(dono.id, CIVIC);

    expect(veiculo.placa).toBe('MHT4A21');
    expect(veiculo.ativo).toBe(true);
  });

  it('recusa cadastrar a mesma placa duas vezes para o mesmo dono', async () => {
    const dono = await criarUsuario();
    await veiculoService.criar(dono.id, CIVIC);

    const erro = await capturarErro(() => veiculoService.criar(dono.id, CIVIC));

    expect(erro.codigo).toBe('CONFLITO');
    expect(erro.campo).toBe('placa');
    expect(erro.message).toContain('Você já tem');
  });

  it('recusa placa que pertence a outro funcionário', async () => {
    const dono = await criarUsuario();
    const outro = await criarUsuario();
    await veiculoService.criar(dono.id, CIVIC);

    const erro = await capturarErro(() => veiculoService.criar(outro.id, CIVIC));

    expect(erro.codigo).toBe('CONFLITO');
    expect(erro.message).toContain('outro funcionário');
  });

  /**
   * DT-11. A remoção é lógica e a placa continua ocupando o índice único, então
   * sem este comportamento o funcionário levaria 409 para sempre ao tentar
   * recadastrar o próprio carro — e nem veria o veículo na listagem.
   */
  it('reativa o mesmo registro ao recadastrar veículo removido', async () => {
    const dono = await criarUsuario();
    const original = await veiculoService.criar(dono.id, CIVIC);
    await veiculoService.inativar(original.id, dono.id);

    const recadastrado = await veiculoService.criar(dono.id, { ...CIVIC, cor: 'Branco' });

    expect(recadastrado.id).toBe(original.id);
    expect(recadastrado.ativo).toBe(true);
    expect(recadastrado.cor).toBe('Branco');
  });

  it('o veículo reativado volta a aparecer na listagem', async () => {
    const dono = await criarUsuario();
    const original = await veiculoService.criar(dono.id, CIVIC);
    await veiculoService.inativar(original.id, dono.id);

    expect(await veiculoService.listarDoUsuario(dono.id)).toHaveLength(0);

    await veiculoService.criar(dono.id, CIVIC);

    expect(await veiculoService.listarDoUsuario(dono.id)).toHaveLength(1);
  });
});

describe('isolamento entre funcionários', () => {
  it('não deixa um funcionário ver o veículo de outro', async () => {
    const dono = await criarUsuario();
    const intruso = await criarUsuario();
    const veiculo = await criarVeiculo(dono.id);

    const erro = await capturarErro(() => veiculoService.buscarPorId(veiculo.id, intruso.id));

    expect(erro.codigo).toBe('SEM_PERMISSAO');
    expect(erro.status).toBe(403);
  });

  it('não deixa um funcionário editar o veículo de outro', async () => {
    const dono = await criarUsuario();
    const intruso = await criarUsuario();
    const veiculo = await criarVeiculo(dono.id);

    const erro = await capturarErro(() =>
      veiculoService.atualizar(veiculo.id, intruso.id, { cor: 'Vermelho' }),
    );

    expect(erro.codigo).toBe('SEM_PERMISSAO');
  });

  it('devolve 404 para veículo inexistente', async () => {
    const alguem = await criarUsuario();

    const erro = await capturarErro(() =>
      veiculoService.buscarPorId('00000000-0000-0000-0000-000000000000', alguem.id),
    );

    expect(erro.status).toBe(404);
  });
});

describe('redução de capacidade — RN-01 pela porta dos fundos', () => {
  it('bloqueia baixar a capacidade abaixo de uma carona futura já publicada', async () => {
    const dono = await criarUsuario();
    const veiculo = await criarVeiculo(dono.id, { capacidadePassageiros: 4 });
    const rota = await criarRota(dono.id);
    await criarCarona(rota, veiculo.id, { vagasOfertadas: 4, dia: emDias(2) });

    const erro = await capturarErro(() =>
      veiculoService.atualizar(veiculo.id, dono.id, { capacidadePassageiros: 2 }),
    );

    expect(erro.codigo).toBe('REGRA_NEGOCIO');
    expect(erro.campo).toBe('capacidadePassageiros');
  });

  /**
   * DT-12. Enquanto não existir o job que move ABERTA -> CONCLUIDA (DT-09),
   * caronas antigas ficam paradas em ABERTA. Sem o recorte por data elas
   * travariam a capacidade do veículo para sempre.
   */
  it('permite baixar a capacidade quando a carona conflitante já passou', async () => {
    const dono = await criarUsuario();
    const veiculo = await criarVeiculo(dono.id, { capacidadePassageiros: 4 });
    const rota = await criarRota(dono.id);
    await criarCarona(rota, veiculo.id, { vagasOfertadas: 4, dia: emDias(-7) });

    const atualizado = await veiculoService.atualizar(veiculo.id, dono.id, {
      capacidadePassageiros: 2,
    });

    expect(atualizado.capacidadePassageiros).toBe(2);
  });

  it('permite baixar a capacidade quando a carona conflitante foi cancelada', async () => {
    const dono = await criarUsuario();
    const veiculo = await criarVeiculo(dono.id, { capacidadePassageiros: 4 });
    const rota = await criarRota(dono.id);
    await criarCarona(rota, veiculo.id, {
      vagasOfertadas: 4,
      dia: emDias(2),
      status: 'CANCELADA',
    });

    const atualizado = await veiculoService.atualizar(veiculo.id, dono.id, {
      capacidadePassageiros: 2,
    });

    expect(atualizado.capacidadePassageiros).toBe(2);
  });

  it('permite subir a capacidade sem restrição', async () => {
    const dono = await criarUsuario();
    const veiculo = await criarVeiculo(dono.id, { capacidadePassageiros: 4 });
    const rota = await criarRota(dono.id);
    await criarCarona(rota, veiculo.id, { vagasOfertadas: 4, dia: emDias(2) });

    const atualizado = await veiculoService.atualizar(veiculo.id, dono.id, {
      capacidadePassageiros: 6,
    });

    expect(atualizado.capacidadePassageiros).toBe(6);
  });
});

describe('remoção de veículo', () => {
  it('remove logicamente, mantendo o registro no banco', async () => {
    const dono = await criarUsuario();
    const veiculo = await criarVeiculo(dono.id);

    await veiculoService.inativar(veiculo.id, dono.id);

    const depois = await veiculoService.buscarPorId(veiculo.id, dono.id);
    expect(depois.ativo).toBe(false);
  });

  it('recusa remover veículo com carona agendada', async () => {
    const dono = await criarUsuario();
    const veiculo = await criarVeiculo(dono.id);
    const rota = await criarRota(dono.id);
    await criarCarona(rota, veiculo.id, { dia: emDias(2) });

    const erro = await capturarErro(() => veiculoService.inativar(veiculo.id, dono.id));

    expect(erro.codigo).toBe('REGRA_NEGOCIO');
    expect(erro.message).toContain('carona agendada');
  });

  it('permite remover veículo cujas caronas já aconteceram', async () => {
    const dono = await criarUsuario();
    const veiculo = await criarVeiculo(dono.id);
    const rota = await criarRota(dono.id);
    await criarCarona(rota, veiculo.id, { dia: emDias(-3) });

    await veiculoService.inativar(veiculo.id, dono.id);

    expect(await veiculoService.listarDoUsuario(dono.id)).toHaveLength(0);
  });
});
