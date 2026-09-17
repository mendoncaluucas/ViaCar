# ViaCar — Guia de Estilo e Padrões de Código

> Preenche a **Seção 5 do Acordo de Manutenibilidade e Engenharia de Software** (que estava com textos de exemplo).
> **Responsável pela seção:** Lucas Rogério Mendonça — Desenvolvedor Backend
> Vale para todo o repositório. Front e back seguem o mesmo documento.

---

## 5.1. Convenções de Código

### Linguagem

| Camada | Stack |
|---|---|
| Backend | **Node.js 22 + TypeScript** (Express 5, Prisma, Zod) |
| Banco | **PostgreSQL 16** via Docker |
| Frontend | **React + TypeScript + Vite** |

TypeScript em modo `strict`. `any` só com comentário justificando — senão vira código morto disfarçado.

### Idioma do código

**Domínio em português, técnico em inglês.** O vocabulário do case (carona, rota, reserva, vaga, motorista, passageiro) é o que a banca e o próximo grupo vão procurar no código; traduzir pra *ride/booking* só adiciona um dicionário mental. Já os termos de framework são inglês por convenção da ferramenta.

```ts
// certo
class CaronaService {
  async criarCarona(dados: CriarCaronaDTO): Promise<Carona> { }
}

// errado — mistura sem critério
class RideService {
  async criarRide(dados: CriarRideDados) { }
}
```

| Em português | Em inglês |
|---|---|
| Entidades, campos, regras, serviços, rotas HTTP, mensagens de erro | `controller`, `service`, `middleware`, `repository`, `request`, `response`, `router`, `test` |

Comentários: **português**. E comentário explica *por quê*, não *o quê* — o código já diz o quê.

### Nomenclatura de variáveis e funções

`camelCase`, nome descritivo, sem abreviação e **sem prefixo de tipo** (nada de `nmNome`, `strEmail`). O TypeScript já carrega o tipo; o prefixo só envelhece e mente quando o tipo muda.

```ts
const vagasDisponiveis = carona.vagasOfertadas - reservasConfirmadas;   // ✅
const vd = c.vo - rc;                                                    // ❌
const nmVagasDisponiveis = ...;                                          // ❌
```

- Booleano começa com `e`, `esta`, `tem`, `pode`: `estaLotada`, `temVagaDisponivel`, `podeReservar`
- Função é verbo no infinitivo: `criarCarona`, `validarCapacidade`, `cancelarReserva`
- Constante global em `UPPER_SNAKE_CASE`: `CAPACIDADE_MAXIMA_VEICULO`

### Nomenclatura de classes, tipos e enums

`PascalCase`, sem prefixo: `CaronaService`, `CriarCaronaDTO`, `StatusCarona`, `AppError`.

### Nomenclatura de arquivos e pastas

`kebab-case`, com sufixo que diz o papel do arquivo. Pastas sempre no **plural**.

```
src/modules/caronas/carona.controller.ts
src/modules/caronas/carona.service.ts
src/modules/caronas/carona.routes.ts
src/modules/caronas/carona.schema.ts
src/shared/middlewares/tratar-erros.ts
tests/regras-negocio/rn-01-capacidade-veiculo.test.ts
```

### Nomenclatura no banco de dados

`snake_case` em tudo (padrão do Postgres), tabela no **singular**, chave estrangeira como `<tabela>_id`, datas com sufixo `_em`.

```sql
usuario, veiculo, rota, carona, reserva
capacidade_passageiros, vagas_ofertadas, criado_em, atualizado_em
usuario_id, carona_id, passageiro_id
```

O Prisma faz a ponte com `@map` / `@@map` — o TypeScript vê `camelCase`, o banco guarda `snake_case`. Ninguém precisa ceder.

---

## 5.2. Boas Práticas de Manutenibilidade

### Responsabilidade única e limite de 30 linhas

Do acordo: função com responsabilidade única, teto de 30 linhas sem justificativa técnica. Se `criarCarona` passar disso, o que sobra é validação — extrai pra `validarCapacidadeDoVeiculo()`. Além de caber no acordo, isola a RN crítica num lugar testável.

### Regra de negócio mora no `service`

- `controller`: lê `req`, chama o service, devolve `res`. Sem `if` de negócio.
- `service`: valida regra, orquestra transação, é o **único** que fala com o Prisma.
- `middleware`: autenticação, validação de payload (Zod) e tratamento de erro.

Esse é o corte que faz o próximo grupo conseguir plugar pontos e avaliação sem reescrever o sistema.

### Proibido `catch` vazio

Do acordo, e sem exceção. Ou trata, ou registra, ou repassa:

```ts
// ❌ engole o erro — a demo quebra e ninguém sabe por quê
try { await reservarVaga(id); } catch (e) { }

// ✅
try {
  await reservarVaga(id);
} catch (erro) {
  logger.error({ erro, caronaId: id }, 'Falha ao reservar vaga');
  throw new AppError('REGRA_NEGOCIO', 'Não foi possível reservar a vaga.', 422);
}
```

Erro de negócio é `AppError` com código, mensagem em português e status HTTP. Um único middleware `tratarErros` formata a resposta — nenhum controller monta JSON de erro na mão.

### Sem duplicação

Regra que aparece em dois services vira função em `shared/`. Antes de escrever um helper, procurar se já existe.

### Sem código morto

Do critério de avaliação da N1 (1,0 ponto): **nada de código comentado, import não usado, arquivo `teste2.ts` ou função órfã.** O git guarda o histórico — se precisar depois, recupera de lá. Rodar `npm run lint` antes de abrir PR.

### Variáveis de ambiente

Nada de credencial no código. `.env` no `.gitignore`, `.env.example` versionado com todas as chaves e valores fake. `src/config/env.ts` valida no boot e derruba a aplicação com mensagem clara se faltar variável — melhor falhar no start do que no meio da demo.

---

## Ferramentas (configuração com o DevOps — Seção 6.3 do acordo)

| Ferramenta | Uso |
|---|---|
| ESLint | `@typescript-eslint` — erro em `any` implícito, variável não usada, `catch` vazio |
| Prettier | 2 espaços, aspas simples, ponto e vírgula, 100 colunas |
| Husky + lint-staged | Bloqueia commit que não passa no lint |

**Regra de integração (do acordo):** nenhum PR é aprovado com erro crítico do linter.

---

## Padrão de commits (Seção 6.2 do acordo)

Conventional Commits, mensagem em português:

```
feat: adiciona validacao de capacidade do veiculo na criacao de carona
fix: corrige liberacao de vaga ao cancelar reserva
refactor: extrai validacao de capacidade para funcao dedicada
docs: adiciona DER e dicionario de dados
```

Branches: `feature/nome-da-funcionalidade` · `fix/descricao-do-bug`.

---

> **Pendência:** o Acordo listava `nmExemplo` / `clExemplo` como *exemplo* de nomenclatura. Este documento adota `camelCase` / `PascalCase` no lugar, pelo motivo explicado acima. Levar ao Vinicius (PO) para registrar a atualização da Seção 5 do Acordo.
