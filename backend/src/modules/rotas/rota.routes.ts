import { Router } from 'express';
import { autenticar } from '../../shared/middlewares/autenticar';
import { validarCorpo } from '../../shared/middlewares/validar';
import * as rotaController from './rota.controller';
import { atualizarRotaSchema, criarRotaSchema } from './rota.schema';

export const rotaRoutes = Router();

rotaRoutes.use(autenticar);

rotaRoutes.post('/', validarCorpo(criarRotaSchema), rotaController.criar);
rotaRoutes.get('/', rotaController.listar);
rotaRoutes.get('/:id', rotaController.buscarPorId);
rotaRoutes.patch('/:id', validarCorpo(atualizarRotaSchema), rotaController.atualizar);
rotaRoutes.delete('/:id', rotaController.inativar);
