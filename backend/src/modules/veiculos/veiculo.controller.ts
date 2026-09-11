import type { RequestHandler } from 'express';
import { usuarioLogado } from '../../shared/middlewares/autenticar';
import { parametroObrigatorio } from '../../shared/utils/parametros';
import * as veiculoService from './veiculo.service';

export const criar: RequestHandler = async (req, res) => {
  const veiculo = await veiculoService.criar(usuarioLogado(req), req.body);
  res.status(201).json(veiculo);
};

export const listar: RequestHandler = async (req, res) => {
  const veiculos = await veiculoService.listarDoUsuario(usuarioLogado(req));
  res.json(veiculos);
};

export const buscarPorId: RequestHandler = async (req, res) => {
  const veiculo = await veiculoService.buscarPorId(parametroObrigatorio(req, 'id'), usuarioLogado(req));
  res.json(veiculo);
};

export const atualizar: RequestHandler = async (req, res) => {
  const veiculo = await veiculoService.atualizar(
    parametroObrigatorio(req, 'id'),
    usuarioLogado(req),
    req.body,
  );
  res.json(veiculo);
};

export const inativar: RequestHandler = async (req, res) => {
  await veiculoService.inativar(parametroObrigatorio(req, 'id'), usuarioLogado(req));
  res.status(204).send();
};
