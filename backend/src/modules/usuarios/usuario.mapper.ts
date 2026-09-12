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
/** Versão reduzida, para aparecer embutida dentro de outro recurso. */
export interface UsuarioResumo {
  id: string;
  nome: string;
  bairro: string;
  telefone: string | null;
}

/**
 * Usado onde um usuário aparece como parte de outro recurso — o motorista de uma
 * carona, por exemplo. Expõe menos que `paraPublico`: matrícula e e-mail são
 * dados funcionais e não precisam circular na listagem de caronas da empresa.
 */
export function paraResumo(usuario: Pick<Usuario, 'id' | 'nome' | 'bairro' | 'telefone'>): UsuarioResumo {
  return {
    id: usuario.id,
    nome: usuario.nome,
    bairro: usuario.bairro,
    telefone: usuario.telefone,
  };
}

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
