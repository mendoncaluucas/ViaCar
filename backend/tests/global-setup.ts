import { execSync } from 'node:child_process';

/**
 * Roda UMA vez antes de toda a suíte: garante que o banco de teste existe e está
 * com as migrations aplicadas — incluindo as constraints e a trigger da RN-01,
 * que são justamente o que vários testes verificam.
 */
export default function preparar(): void {
  const url = process.env['DATABASE_URL'];

  if (!url) {
    throw new Error('DATABASE_URL não definida. O .env.test foi carregado?');
  }

  if (!url.includes('_test')) {
    throw new Error(
      `Recusando rodar a suíte: DATABASE_URL não aponta para um banco de teste.\n` +
        `Encontrado: ${url}\n` +
        `A suíte limpa as tabelas — apontar para o banco de desenvolvimento apagaria seus dados.`,
    );
  }

  criarBancoSeNaoExistir(url);

  execSync('npx prisma migrate deploy', {
    stdio: 'inherit',
    env: { ...process.env, DATABASE_URL: url },
  });
}

/**
 * O `prisma migrate deploy` não cria o banco, só aplica migrations num que já
 * existe. Como todo o ambiente roda em Docker, criar pelo container é o caminho
 * mais curto — e o `IF NOT EXISTS` do psql torna a chamada idempotente.
 */
function criarBancoSeNaoExistir(url: string): void {
  const nome = new URL(url).pathname.replace('/', '');

  try {
    execSync(
      `docker exec viacar-postgres psql -U viacar -d postgres -tc ` +
        `"SELECT 1 FROM pg_database WHERE datname='${nome}'" | ` +
        `grep -q 1 || docker exec viacar-postgres psql -U viacar -d postgres -c "CREATE DATABASE ${nome}"`,
      { stdio: 'pipe', shell: 'bash' },
    );
  } catch {
    // Sem bash disponível (Windows puro): tenta criar direto e ignora "já existe".
    try {
      execSync(`docker exec viacar-postgres psql -U viacar -d postgres -c "CREATE DATABASE ${nome}"`, {
        stdio: 'pipe',
      });
    } catch (erro) {
      const texto = String(erro);
      if (!texto.includes('already exists') && !texto.includes('já existe')) {
        throw new Error(
          `Não foi possível criar o banco de teste "${nome}". ` +
            `O container viacar-postgres está de pé? (docker compose up -d)\n${texto}`,
        );
      }
    }
  }
}
