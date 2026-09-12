import type { RequestHandler } from 'express';
import { usuarioLogado } from '../../shared/middlewares/autenticar';
import { parametroObrigatorio } from '../../shared/utils/parametros';
import * as rotaService from './rota.service';

export const criar: RequestHandler = async (req, res) => {
  const rota = await rotaService.criar(usuarioLogado(req), req.body);
  res.status(201).json(rota);
};

export const listar: RequestHandler = async (req, res) => {
  res.json(await rotaService.listarDoMotorista(usuarioLogado(req)));
};

export const buscarPorId: RequestHandler = async (req, res) => {
  const rota = await rotaService.buscarPorId(parametroObrigatorio(req, 'id'), usuarioLogado(req));
  res.json(rota);
};

export const atualizar: RequestHandler = async (req, res) => {
  const rota = await rotaService.atualizar(
    parametroObrigatorio(req, 'id'),
    usuarioLogado(req),
    req.body,
  );
  res.json(rota);
};

export const inativar: RequestHandler = async (req, res) => {
  await rotaService.inativar(parametroObrigatorio(req, 'id'), usuarioLogado(req));
  res.status(204).send();
};
