import { Prisma, PrismaClient } from '@prisma/client';
import { env } from './env';

/**
 * Nos testes, boa parte dos erros do banco é esperada — a suíte verifica
 * justamente que trigger e constraints disparam. Logar todos encheria a saída
 * de ruído e esconderia a falha de verdade.
 */
const NIVEL_DE_LOG: Record<typeof env.NODE_ENV, Prisma.LogLevel[]> = {
  development: ['warn', 'error'],
  production: ['error'],
  test: [],
};

/**
 * Instância única do Prisma. Nunca crie `new PrismaClient()` fora daqui — cada
 * instância abre seu próprio pool de conexões e o Postgres estoura o limite.
 */
export const prisma = new PrismaClient({
  log: NIVEL_DE_LOG[env.NODE_ENV],
});
