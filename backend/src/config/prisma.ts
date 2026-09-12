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
 * Cliente do Prisma aceito por qualquer função que precise rodar tanto solta
 * quanto dentro de uma transação.
 *
 * Existe porque chamar `prisma.algumaCoisa()` de dentro de
 * `prisma.$transaction(async (tx) => ...)` executa **fora** da transação: o
 * lock não protege aquela consulta, e o problema só aparece sob concorrência —
 * exatamente o cenário que ninguém testa na mão.
 *
 * O singleton satisfaz este tipo, então `db = prisma` como padrão mantém as
 * chamadas existentes funcionando sem alteração.
 */
export type ClientePrisma = Prisma.TransactionClient;

/**
 * Instância única do Prisma. Nunca crie `new PrismaClient()` fora daqui — cada
 * instância abre seu próprio pool de conexões e o Postgres estoura o limite.
 */
export const prisma = new PrismaClient({
  log: NIVEL_DE_LOG[env.NODE_ENV],
  transactionOptions: {
    // O padrão do Prisma é 5s. A reserva de vaga trava a linha da carona, e
    // sob disputa o tempo de espera conta contra esse limite.
    timeout: 10_000,
    // Tempo que uma transação espera por conexão livre no pool antes de desistir.
    maxWait: 5_000,
  },
});
