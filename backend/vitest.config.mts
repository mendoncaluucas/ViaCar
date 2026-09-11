import { config } from 'dotenv';
import { defineConfig } from 'vitest/config';

// Carrega .env.test ANTES de qualquer import de src/, porque src/config/env.ts
// valida as variáveis no momento em que é importado.
const { parsed } = config({ path: '.env.test', override: true });

export default defineConfig({
  test: {
    globalSetup: ['./tests/global-setup.ts'],
    setupFiles: ['./tests/setup.ts'],
    env: parsed ?? {},

    // Os testes compartilham um único banco e limpam as tabelas entre si.
    // Rodar em paralelo faria um teste apagar as linhas do outro no meio da execução.
    pool: 'forks',
    poolOptions: { forks: { singleFork: true } },
    fileParallelism: false,

    include: ['tests/**/*.test.ts'],
    testTimeout: 20_000,
    hookTimeout: 60_000,
  },
});
