import { Router } from 'express';
import { autenticar } from '../../shared/middlewares/autenticar';
import { validarCorpo } from '../../shared/middlewares/validar';
import * as usuarioController from './usuario.controller';
import { atualizarPerfilSchema } from './usuario.schema';

export const usuarioRoutes = Router();

usuarioRoutes.use(autenticar);

usuarioRoutes.get('/me', usuarioController.buscarPerfil);
usuarioRoutes.patch('/me', validarCorpo(atualizarPerfilSchema), usuarioController.atualizarPerfil);
