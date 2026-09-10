import 'dotenv/config';
import { z } from 'zod';

/**
 * Valida as variaveis de ambiente no boot. Se faltar alguma, a aplicacao morre aqui
 * com mensagem clara - melhor falhar no `npm run dev` do que no meio da apresentacao.
 */
const esquemaEnv = z.object({
  DATABASE_URL: z.string().min(1, 'obrigatoria - copie do .env.example'),
  PORT: z.coerce.number().int().positive().default(3333),
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  JWT_SECRET: z.string().min(16, 'precisa ter ao menos 16 caracteres'),
  JWT_EXPIRES_IN: z.string().default('8h'),
  CORS_ORIGIN: z.string().default('http://localhost:5173'),
});

const resultado = esquemaEnv.safeParse(process.env);

if (!resultado.success) {
  console.error('\n[ViaCar] Variaveis de ambiente invalidas:\n');
  for (const problema of resultado.error.issues) {
    console.error(`  - ${problema.path.join('.')}: ${problema.message}`);
  }
  console.error('\nCopie o arquivo .env.example para .env e preencha os valores.\n');
  process.exit(1);
}

export const env = resultado.data;
