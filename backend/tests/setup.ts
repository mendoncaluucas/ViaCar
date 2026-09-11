import { afterAll, beforeEach } from 'vitest';
import { prisma } from '../src/config/prisma';

/**
 * Trava de segurança. Repetida aqui, mesmo já existindo no global-setup, porque
 * este arquivo é quem de fato executa o TRUNCATE — e a consequência de apontar
 * para o banco errado é perder os dados de desenvolvimento do dia.
 */
const url = process.env['DATABASE_URL'] ?? '';
if (!url.includes('_test')) {
  throw new Error(`Suíte abortada: DATABASE_URL não é um banco de teste (${url}).`);
}

/**
 * Cada teste começa com as tabelas vazias, para que a ordem de execução não
 * influencie o resultado. TRUNCATE ... CASCADE resolve as chaves estrangeiras
 * de uma vez — e o schema não tem `onDelete: Cascade`, então DELETE exigiria
 * respeitar a ordem de dependência manualmente.
 */
beforeEach(async () => {
  await prisma.$executeRawUnsafe(
    'TRUNCATE TABLE reserva, carona, rota, veiculo, usuario RESTART IDENTITY CASCADE',
  );
});

afterAll(async () => {
  await prisma.$disconnect();
});
