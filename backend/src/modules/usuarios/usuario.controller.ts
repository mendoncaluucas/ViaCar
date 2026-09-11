import type { RequestHandler } from 'express';
import { usuarioLogado } from '../../shared/middlewares/autenticar';
import * as usuarioService from './usuario.service';

export const buscarPerfil: RequestHandler = async (req, res) => {
  const perfil = await usuarioService.buscarPerfil(usuarioLogado(req));
  res.json(perfil);
};

export const atualizarPerfil: RequestHandler = async (req, res) => {
  const perfil = await usuarioService.atualizarPerfil(usuarioLogado(req), req.body);
  res.json(perfil);
};
