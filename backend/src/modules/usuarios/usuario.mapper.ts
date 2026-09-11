import type { Usuario } from '@prisma/client';

export interface UsuarioPublico {
  id: string;
  nome: string;
  email: string;
  matricula: string;
  telefone: string | null;
  bairro: string;
  ativo: boolean;
  criadoEm: Date;
}

/**
 * Unico caminho pelo qual um Usuario sai da API. Existe para que `senhaHash`
 * nunca vaze por esquecimento: quem adicionar campo novo no schema precisa
 * decidir aqui, explicitamente, se ele e publico.
 *
 * Fica em `usuarios` e nao em `auth` porque Usuario e a entidade deste modulo -
 * caronas tambem vao precisar disto para exibir o motorista no D3.
 */
export function paraPublico(usuario: Usuario): UsuarioPublico {
  return {
    id: usuario.id,
    nome: usuario.nome,
    email: usuario.email,
    matricula: usuario.matricula,
    telefone: usuario.telefone,
    bairro: usuario.bairro,
    ativo: usuario.ativo,
    criadoEm: usuario.criadoEm,
  };
}
