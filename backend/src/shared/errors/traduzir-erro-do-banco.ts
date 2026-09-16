import { Prisma } from '@prisma/client';
import { AppError } from './app-error';

/**
 * Traduz erro vindo do banco para o envelope da API.
 *
 * Sem isto, toda violacao de constraint vira 500 "Erro inesperado" - inclusive a
 * trigger da RN-01, que e a regra critica do case. Duas formas chegam ate aqui:
 *
 * - `PrismaClientKnownRequestError`: o Prisma reconheceu (P2002, P2003, P2025).
 * - `PrismaClientUnknownRequestError`: veio cru do Postgres (CHECK e trigger).
 *   Nesse caso o codigo e a mensagem estao no texto do erro e precisam ser extraidos.
 */

const POSTGRES_VIOLACAO_CHECK = '23514';
const POSTGRES_VIOLACAO_UNIQUE = '23505';
const POSTGRES_VIOLACAO_FK = '23503';

/** `invalid input syntax for type uuid` — o texto da URL nao vira uuid. */
const POSTGRES_TEXTO_INVALIDO = '22P02';

const ID_INVALIDO = 'O identificador informado na URL não é válido.';

/** Captura `code: "23514"` e `message: "..."` de dentro do erro cru do conector. */
const ERRO_CRU_DO_POSTGRES = /code:\s*"(\d{5})"[\s\S]*?message:\s*"((?:[^"\\]|\\.)*)"/;

function primeiroCampo(alvo: unknown): string | undefined {
  if (Array.isArray(alvo) && typeof alvo[0] === 'string') {
    return alvo[0];
  }
  return undefined;
}

function traduzirConhecido(erro: Prisma.PrismaClientKnownRequestError): AppError | null {
  switch (erro.code) {
    case 'P2002': {
      const campo = primeiroCampo(erro.meta?.['target']);
      return new AppError(
        'CONFLITO',
        campo
          ? `Já existe um registro cadastrado com este valor de "${campo}".`
          : 'Já existe um registro cadastrado com estes dados.',
        campo,
      );
    }
    case 'P2003':
      return new AppError(
        'CONFLITO',
        'Este registro está vinculado a outros e por isso não pode ser removido.',
      );
    case 'P2025':
      return new AppError('NAO_ENCONTRADO', 'Registro não encontrado.');

    // Id malformado chegando pelo ORM: `/veiculos/abc`, ou um id que veio vazio
    // do estado do frontend. Sem este ramo vira 500 "Erro inesperado", e quem
    // chamou nao descobre que o problema e o id que ele mesmo mandou.
    case 'P2023':
      return new AppError('VALIDACAO', ID_INVALIDO);

    // Falha de `$queryRaw` — o codigo do Postgres vem em `meta.code`. E por aqui
    // que um id torto chega quando a rota usa o FOR UPDATE da RN-02, que faz
    // cast explicito para uuid.
    case 'P2010':
      return erro.meta?.['code'] === POSTGRES_TEXTO_INVALIDO
        ? new AppError('VALIDACAO', ID_INVALIDO)
        : null;

    default:
      return null;
  }
}

function traduzirCru(erro: Prisma.PrismaClientUnknownRequestError): AppError | null {
  const achado = ERRO_CRU_DO_POSTGRES.exec(erro.message);
  const codigo = achado?.[1];
  const mensagemDoBanco = achado?.[2]?.replace(/\\"/g, '"') ?? '';

  switch (codigo) {
    case POSTGRES_VIOLACAO_CHECK:
      // As triggers do projeto escrevem mensagem pronta para o usuario e a prefixam
      // com o id da regra. Qualquer outro CHECK expoe nome de coluna e constraint,
      // entao vira mensagem generica em vez de vazar estrutura do banco.
      return new AppError(
        'REGRA_NEGOCIO',
        mensagemDoBanco.startsWith('RN-')
          ? mensagemDoBanco
          : 'Os dados informados violam uma regra de negócio do sistema.',
      );
    case POSTGRES_VIOLACAO_UNIQUE:
      return new AppError('CONFLITO', 'Já existe um registro cadastrado com estes dados.');
    case POSTGRES_VIOLACAO_FK:
      return new AppError('CONFLITO', 'Este registro está vinculado a outros e não pode ser alterado.');
    case POSTGRES_TEXTO_INVALIDO:
      return new AppError('VALIDACAO', ID_INVALIDO);
    default:
      return null;
  }
}

/** Devolve `null` quando o erro nao veio do banco ou nao e reconhecido. */
export function traduzirErroDoBanco(erro: unknown): AppError | null {
  if (erro instanceof Prisma.PrismaClientKnownRequestError) {
    return traduzirConhecido(erro);
  }

  if (erro instanceof Prisma.PrismaClientUnknownRequestError) {
    return traduzirCru(erro);
  }

  return null;
}
