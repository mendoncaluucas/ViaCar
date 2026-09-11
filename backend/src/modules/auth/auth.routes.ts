import { Router } from 'express';
import { validarCorpo } from '../../shared/middlewares/validar';
import * as authController from './auth.controller';
import { loginSchema, registrarSchema } from './auth.schema';

export const authRoutes = Router();

// Unicas rotas publicas da API.
authRoutes.post('/registrar', validarCorpo(registrarSchema), authController.registrar);
authRoutes.post('/login', validarCorpo(loginSchema), authController.login);
