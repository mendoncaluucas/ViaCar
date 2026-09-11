import { z } from 'zod';

/**
 * Nome, e-mail e matricula sao dados funcionais da empresa e nao se editam por
 * aqui. O funcionario atualiza apenas contato e bairro - o bairro importa porque
 * e o que aproxima quem mora perto na busca por caronas.
 */
export const atualizarPerfilSchema = z
  .object({
    telefone: z.string().trim().max(20).nullable().optional(),
    bairro: z.string().trim().min(2, 'Bairro é obrigatório.').max(80).optional(),
  })
  .refine((dados) => Object.keys(dados).length > 0, {
    message: 'Informe ao menos um campo para atualizar.',
  });

export type AtualizarPerfilDTO = z.infer<typeof atualizarPerfilSchema>;
