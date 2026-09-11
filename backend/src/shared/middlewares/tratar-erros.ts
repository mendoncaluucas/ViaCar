import type { ErrorRequestHandler } from 'express';
import { ZodError } from 'zod';
import { AppError } from '../errors/app-error';
import { traduzirErroDoBanco } from '../errors/traduzir-erro-do-banco';

/**
 * Tratador central de erros. Nenhum controller monta JSON de erro na mao -
 * o formato da resposta e definido aqui e em um lugar so.
 *
 * O Express 5 encaminha rejeicoes de handlers async para ca automaticamente,
 * entao services podem simplesmente dar `throw new AppError(...)`.
 */
export const tratarErros: ErrorRequestHandler = (erro, _req, res, _next) => {
  if (erro instanceof AppError) {
    res.status(erro.status).json({
      erro: erro.codigo,
      mensagem: erro.message,
      campo: erro.campo,
    });
    return;
  }

  if (erro instanceof ZodError) {
    const problema = erro.issues[0];
    res.status(400).json({
      erro: 'VALIDACAO',
      mensagem: problema?.message ?? 'Dados invalidos.',
      campo: problema?.path.join('.'),
    });
    return;
  }

  // Constraint, trigger ou chave estrangeira do banco. Chegar aqui significa que
  // a validacao do service deixou passar, entao o original vai para o log mesmo
  // com a resposta tratada - e assim que a regra faltante e descoberta.
  const doBanco = traduzirErroDoBanco(erro);
  if (doBanco) {
    console.warn('[ViaCar] Regra barrada pelo banco, nao pelo service:', erro);
    res.status(doBanco.status).json({
      erro: doBanco.codigo,
      mensagem: doBanco.message,
      campo: doBanco.campo,
    });
    return;
  }

  // Erro nao previsto: registra o original e devolve mensagem generica.
  // Proibido engolir - o acordo da equipe veta `catch` vazio.
  console.error('[ViaCar] Erro nao tratado:', erro);
  res.status(500).json({
    erro: 'ERRO_INTERNO',
    mensagem: 'Erro inesperado no servidor.',
  });
};
