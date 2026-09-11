import { z } from 'zod';

export const registrarSchema = z.object({
  nome: z.string().trim().min(3, 'Nome precisa ter ao menos 3 caracteres.').max(120),
  email: z.email('Informe um e-mail valido.').max(160),
  senha: z
    .string()
    .min(8, 'Senha precisa ter ao menos 8 caracteres.')
    .max(72, 'Senha pode ter no maximo 72 caracteres.'),
  matricula: z.string().trim().min(2, 'Matricula e obrigatoria.').max(20),
  telefone: z.string().trim().max(20).optional(),
  bairro: z.string().trim().min(2, 'Bairro e obrigatorio.').max(80),
});

export const loginSchema = z.object({
  email: z.email('Informe um e-mail valido.'),
  senha: z.string().min(1, 'Senha e obrigatoria.'),
});

export type RegistrarDTO = z.infer<typeof registrarSchema>;
export type LoginDTO = z.infer<typeof loginSchema>;
