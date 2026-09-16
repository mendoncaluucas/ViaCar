import { describe, expect, it } from 'vitest';
import { prisma } from '../../src/config/prisma';
import { traduzirErroDoBanco } from '../../src/shared/errors/traduzir-erro-do-banco';

/**
 * Id malformado na URL.
 *
 * O `id` de rota chega como texto puro — nada garante que seja um uuid. Antes
 * destes casos serem tratados, `GET /veiculos/abc` devolvia **500 Erro
 * inesperado** em todos os módulos desde o D2: o frontend via uma falha de
 * servidor quando o problema era o id que ele mesmo tinha mandado.
 *
 * São duas formas diferentes de erro, porque são dois caminhos diferentes até o
 * banco: o ORM recusa antes de consultar, e o `$queryRaw` do `FOR UPDATE` só
 * descobre no cast do Postgres.
 */
async function capturar(acao: () => Promise<unknown>): Promise<unknown> {
  try {
    await acao();
  } catch (erro) {
    return erro;
  }
  throw new Error('Esperava um erro do banco, mas a operação foi concluída.');
}

describe('id malformado vira 400, não 500', () => {
  it('traduz o erro do ORM (P2023)', async () => {
    const erro = await capturar(() => prisma.veiculo.findUnique({ where: { id: 'abc' } }));

    const traduzido = traduzirErroDoBanco(erro);

    expect(traduzido).not.toBeNull();
    expect(traduzido?.status).toBe(400);
    expect(traduzido?.codigo).toBe('VALIDACAO');
    expect(traduzido?.message).toContain('identificador informado na URL');
  });

  it('traduz o erro do $queryRaw usado pelo FOR UPDATE (P2010 / 22P02)', async () => {
    const erro = await capturar(
      () => prisma.$queryRaw`SELECT id FROM carona WHERE id = ${'abc'}::uuid`,
    );

    const traduzido = traduzirErroDoBanco(erro);

    expect(traduzido).not.toBeNull();
    expect(traduzido?.status).toBe(400);
    expect(traduzido?.codigo).toBe('VALIDACAO');
  });

  it('não confunde id válido e inexistente com id malformado', async () => {
    const semNada = await prisma.veiculo.findUnique({
      where: { id: '00000000-0000-0000-0000-000000000000' },
    });

    expect(semNada).toBeNull();
  });
});

describe('o que não veio do banco continua passando direto', () => {
  it('devolve null para erro comum, para o 500 genérico assumir', () => {
    expect(traduzirErroDoBanco(new Error('qualquer outra coisa'))).toBeNull();
    expect(traduzirErroDoBanco('nem erro é')).toBeNull();
    expect(traduzirErroDoBanco(null)).toBeNull();
  });
});
