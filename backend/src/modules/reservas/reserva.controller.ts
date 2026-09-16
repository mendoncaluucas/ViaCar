import type { RequestHandler } from 'express';
import { usuarioLogado } from '../../shared/middlewares/autenticar';
import { parametroObrigatorio } from '../../shared/utils/parametros';
import * as reservaService from './reserva.service';

export const criar: RequestHandler = async (req, res) => {
  const reserva = await reservaService.criar(
    usuarioLogado(req),
    parametroObrigatorio(req, 'caronaId'),
    req.body,
  );
  res.status(201).json(reserva);
};

export const listarMinhas: RequestHandler = async (req, res) => {
  res.json(await reservaService.listarDoPassageiro(usuarioLogado(req)));
};

/**
 * Responde com a CARONA atualizada, não com a reserva cancelada: a tela precisa
 * saber quantas vagas sobraram e se a carona voltou a ficar `ABERTA` (RN-06).
 */
export const cancelar: RequestHandler = async (req, res) => {
  const carona = await reservaService.cancelar(parametroObrigatorio(req, 'id'), usuarioLogado(req));
  res.json(carona);
};
