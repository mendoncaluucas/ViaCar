import type { RequestHandler } from 'express';
import * as authService from './auth.service';

export const registrar: RequestHandler = async (req, res) => {
  const resultado = await authService.registrar(req.body);
  res.status(201).json(resultado);
};

export const login: RequestHandler = async (req, res) => {
  const resultado = await authService.login(req.body);
  res.json(resultado);
};
