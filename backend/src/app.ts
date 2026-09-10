import express from 'express';
import cors from 'cors';
import { env } from './config/env';
import { prisma } from './config/prisma';
import { AppError } from './shared/errors/app-error';
import { tratarErros } from './shared/middlewares/tratar-erros';

export const app = express();

app.use(cors({ origin: env.CORS_ORIGIN }));
app.use(express.json());

/**
 * Health check. Nao responde "ok" so por estar de pe: consulta o banco de verdade,
 * senao a API mente quando o Postgres cai.
 */
app.get('/health', async (_req, res) => {
  await prisma.$queryRaw`SELECT 1`;
  res.json({
    status: 'ok',
    servico: 'viacar-api',
    banco: 'conectado',
    ambiente: env.NODE_ENV,
    horario: new Date().toISOString(),
  });
});

// As rotas dos modulos entram aqui a partir do D2:
// app.use('/auth', authRoutes);
// app.use('/veiculos', veiculoRoutes);
// app.use('/rotas', rotaRoutes);
// app.use('/caronas', caronaRoutes);
// app.use('/reservas', reservaRoutes);

// Rota inexistente cai no mesmo envelope de erro do resto da API, em vez do
// HTML padrao do Express - o frontend trata um formato so.
app.use((req, _res, next) => {
  next(new AppError('NAO_ENCONTRADO', `Rota ${req.method} ${req.originalUrl} nao existe.`));
});

app.use(tratarErros);
