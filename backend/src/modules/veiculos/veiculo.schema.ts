import { z } from 'zod';

export const CAPACIDADE_MINIMA = 1;
export const CAPACIDADE_MAXIMA = 8;

/** Aceita placa antiga (ABC1234) e Mercosul (ABC1D23). */
const FORMATO_PLACA = /^[A-Z]{3}[0-9][A-Z0-9][0-9]{2}$/;

const placa = z
  .string()
  .trim()
  .transform((valor) => valor.toUpperCase().replace(/[\s-]/g, ''))
  .refine((valor) => FORMATO_PLACA.test(valor), {
    message: 'Placa invalida. Use o formato ABC1D23 (Mercosul) ou ABC1234.',
  });

export const criarVeiculoSchema = z.object({
  placa,
  modelo: z.string().trim().min(2, 'Modelo e obrigatorio.').max(80),
  cor: z.string().trim().min(2, 'Cor e obrigatoria.').max(40),
  // Nao conta o motorista: um Civic de 5 lugares tem capacidade 4.
  capacidadePassageiros: z.coerce
    .number()
    .int('Capacidade precisa ser um numero inteiro.')
    .min(CAPACIDADE_MINIMA, 'O veiculo precisa ter ao menos 1 vaga para passageiro.')
    .max(CAPACIDADE_MAXIMA, `Capacidade maxima e ${CAPACIDADE_MAXIMA} passageiros.`),
});

export const atualizarVeiculoSchema = criarVeiculoSchema.partial().refine(
  (dados) => Object.keys(dados).length > 0,
  { message: 'Informe ao menos um campo para atualizar.' },
);

export type CriarVeiculoDTO = z.infer<typeof criarVeiculoSchema>;
export type AtualizarVeiculoDTO = z.infer<typeof atualizarVeiculoSchema>;
