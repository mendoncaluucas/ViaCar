import { Router } from 'express';
import { autenticar } from '../../shared/middlewares/autenticar';
import { validarCorpo } from '../../shared/middlewares/validar';
import * as veiculoController from './veiculo.controller';
import { atualizarVeiculoSchema, criarVeiculoSchema } from './veiculo.schema';

export const veiculoRoutes = Router();

veiculoRoutes.use(autenticar);

veiculoRoutes.post('/', validarCorpo(criarVeiculoSchema), veiculoController.criar);
veiculoRoutes.get('/', veiculoController.listar);
veiculoRoutes.get('/:id', veiculoController.buscarPorId);
veiculoRoutes.patch('/:id', validarCorpo(atualizarVeiculoSchema), veiculoController.atualizar);
veiculoRoutes.delete('/:id', veiculoController.inativar);
