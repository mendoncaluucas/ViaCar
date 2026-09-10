import { app } from './app';
import { env } from './config/env';
import { prisma } from './config/prisma';

const servidor = app.listen(env.PORT, () => {
  console.log(`[ViaCar] API no ar em http://localhost:${env.PORT}`);
  console.log(`[ViaCar] Health check em http://localhost:${env.PORT}/health`);
});

/** Fecha o servidor e o pool do Prisma antes de sair, para nao deixar conexao pendurada. */
async function encerrar(sinal: string): Promise<void> {
  console.log(`\n[ViaCar] Recebido ${sinal}, encerrando...`);
  servidor.close();
  await prisma.$disconnect();
  process.exit(0);
}

process.on('SIGINT', () => {
  void encerrar('SIGINT');
});

process.on('SIGTERM', () => {
  void encerrar('SIGTERM');
});
