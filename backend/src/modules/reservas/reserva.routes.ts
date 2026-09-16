import { Router } from 'express';
import { autenticar } from '../../shared/middlewares/autenticar';
import { validarCorpo } from '../../shared/middlewares/validar';
import * as reservaController from './reserva.controller';
import { criarReservaSchema } from './reserva.schema';

/** Montado em `/reservas`. */
export const reservaRoutes = Router();

reservaRoutes.use(autenticar);

reservaRoutes.get('/minhas', reservaController.listarMinhas);
reservaRoutes.delete('/:id', reservaController.cancelar);

/**
 * Montado em `/caronas/:caronaId/reservas`.
 *
 * A URL pendura na carona porque é assim que se lê — "reservar uma vaga NESTA
 * carona" —, mas o código mora aqui: quem mexe em reserva mexe num arquivo só.
 *
 * `mergeParams` é obrigatório. Sem ele, `:caronaId` fica no roteador de cima e
 * `req.params.caronaId` chega `undefined`.
 */
export const reservasDaCaronaRoutes = Router({ mergeParams: true });

reservasDaCaronaRoutes.use(autenticar);

reservasDaCaronaRoutes.post('/', validarCorpo(criarReservaSchema), reservaController.criar);
