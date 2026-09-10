import { PrismaClient } from '@prisma/client';
import { env } from './env';

/**
 * Instancia unica do Prisma. Nunca crie `new PrismaClient()` fora daqui - cada
 * instancia abre seu proprio pool de conexoes e o Postgres estoura o limite.
 */
export const prisma = new PrismaClient({
  log: env.NODE_ENV === 'development' ? ['warn', 'error'] : ['error'],
});
