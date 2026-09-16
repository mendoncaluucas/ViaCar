import { z } from 'zod';

/**
 * O corpo da reserva é quase vazio de propósito: quem reserva sai do token e
 * qual carona sai da URL. Confiar nesses dois vindos do cliente deixaria um
 * funcionário reservar no nome de outro.
 *
 * O ponto de embarque é o único dado que o passageiro acrescenta — "te espero
 * na esquina da padaria" é o que faz a carona funcionar na prática.
 */
export const criarReservaSchema = z.object({
  pontoEmbarque: z
    .string()
    .trim()
    .min(3, 'Descreva o ponto de embarque com ao menos 3 caracteres.')
    .max(160, 'O ponto de embarque deve ter no máximo 160 caracteres.')
    .optional(),
});

export type CriarReservaDTO = z.infer<typeof criarReservaSchema>;
