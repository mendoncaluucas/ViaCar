# ViaCar — Matriz de Papéis e Histórico de Contribuições

> Case 14 — Gestão de Caronas Corporativas · Equipe Draft
> N1 · 10 a 17 de setembro de 2026
> Versão avaliada: [v1.0](https://github.com/mendoncaluucas/ViaCar/releases/tag/v1.0)

O papel atribuído não limitou o que cada um executou. As evidências de repositório abaixo foram extraídas do histórico do git em 17/09/2026.

---

## Resumo

| Papel | Integrante | Evidência no repositório |
|---|---|---|
| Product Owner | Vinicius Steuernagel | Pitch de apresentação, 10 slides · atuação fora do repositório |
| Engenheiro de Requisitos | Henrique Cordeiro de Oliveira | 1 commit · PR #7 · 2 documentos, 396 linhas |
| Quality Assurance | Kaua Lucindo | — |
| Desenvolvedor Frontend | Willian Squena | 9 commits · 25 arquivos · PRs #6 e #8 |
| Desenvolvedor Backend | Lucas Rogério Mendonça | 28 commits · 70 arquivos · PRs #1 a #5, #8 a #12 |
| DevOps | Nicholas Scoz dos Santos | Proteção de branch · revisão do PR #1 |

---

## Vinicius Steuernagel — Product Owner

**Atividades realizadas**

- Elaboração do pitch de apresentação: 10 slides cobrindo problema, solução, conceito de rota × carona, as duas regras críticas, stack, cronograma e débitos técnicos
- Apresentação do pitch à banca
- Definição e validação do escopo do N1

**Evidências**

| | |
|---|---|
| Pitch | `ViaCar — Pitch Case 14.pptx` — 10 slides, entregue junto com esta documentação |
| Apresentação | Conforme item 8 do enunciado, o pitch é apresentado pelo Product Owner |

> A atuação do PO aconteceu fora do repositório, por isso não aparece no histórico do git. O pitch é o artefato produzido.

---

## Henrique Cordeiro de Oliveira — Engenheiro de Requisitos

**Atividades realizadas**

- Especificação de requisitos: 12 histórias de usuário com critérios de aceitação, 16 requisitos funcionais, 9 não funcionais
- Matriz de rastreabilidade ligando histórias, RFs, regras de negócio e endpoints
- Glossário do domínio e registro das questões em aberto
- Documento de handoff para a equipe receptora

**Evidências**

| | |
|---|---|
| PR [#7](https://github.com/mendoncaluucas/ViaCar/pull/7) | `docs: adiciona especificacao de requisitos e handoff` — 16/09 |
| Arquivos | [`docs/requisitos.md`](../docs/requisitos.md) (291 linhas) · [`docs/handoff.md`](../docs/handoff.md) (108 linhas) |
| Revisão | Revisou o PR #7 junto com o backend, que apontou 4 divergências entre documento e código |

---

## Kaua Lucindo — Quality Assurance

**Atividades realizadas**

—

**Evidências**

—

> Não foram registradas contribuições deste integrante durante o período da N1.
>
> A cobertura de qualidade do projeto foi feita pelo desenvolvedor backend: 143 testes automatizados de integração contra banco real, além de uma auditoria de fechamento que encontrou e corrigiu 6 defeitos depois do código já estar pronto e com a suíte verde.

---

## Willian Squena — Desenvolvedor Frontend

**Atividades realizadas**

- Interface web completa em React + TypeScript + Vite: 8 telas
- Autenticação com JWT e persistência de sessão
- Cliente de API tipado, cobrindo os 23 endpoints do backend
- Busca de caronas com filtro por bairro, data e sentido
- Reserva de vaga com ponto de embarque, e cancelamento
- Cadastro, edição e remoção de veículos e rotas
- Abertura de carona com validação de capacidade no formulário

**Evidências**

| | |
|---|---|
| PR [#6](https://github.com/mendoncaluucas/ViaCar/pull/6) | Interface web — 24 arquivos, +9004 linhas · 12 a 15/09 |
| PR [#8](https://github.com/mendoncaluucas/ViaCar/pull/8) | Cadastro de veículos e rotas, cancelamento de reserva — +1634 linhas · 16/09 |
| Commits | 9, em 12, 15 e 16/09 · 25 arquivos em `frontend/` |
| Revisão | Revisou o PR #3 (rotas, caronas e busca) |
| Verificação | `npm run build` (`tsc -b` + `vite build`) limpo; fluxo completo testado contra a API |

---

## Lucas Rogério Mendonça — Desenvolvedor Backend

**Atividades realizadas**

- Modelagem de dados: DER, dicionário e as 10 regras de negócio
- API REST com 23 endpoints, em módulos `controller → service → mapper`
- Autenticação JWT, hash de senha e middleware de autorização
- As 10 regras implementadas, incluindo a RN-10, opcional no escopo
- RN-01 em três camadas, com trigger no banco
- RN-02 com transação e `SELECT ... FOR UPDATE`, medida antes de implementada
- 5 migrations, incluindo constraints, índices parciais e trigger escritos à mão
- Suíte de 143 testes de integração contra banco real
- Contrato da API em Swagger, gerado do código
- Documentação: plano de ação, modelagem, guia de estilo e débitos técnicos
- Auditoria de fechamento que encontrou e corrigiu 6 defeitos após o código pronto

**Evidências**

| | |
|---|---|
| PRs | [#1](https://github.com/mendoncaluucas/ViaCar/pull/1) a [#5](https://github.com/mendoncaluucas/ViaCar/pull/5), [#8](https://github.com/mendoncaluucas/ViaCar/pull/8) a [#12](https://github.com/mendoncaluucas/ViaCar/pull/12) |
| Commits | 28, em 10, 11, 16 e 17/09 · 70 arquivos em `backend/` e 6 em `docs/` |
| Testes | 143 passando · [`backend/tests/`](../backend/tests) |
| Documentos | [`modelagem-dados.md`](../docs/modelagem-dados.md) · [`debitos-tecnicos.md`](../docs/debitos-tecnicos.md) · [`guia-de-estilo.md`](../docs/guia-de-estilo.md) · [`plano-acao-backend.md`](../docs/plano-acao-backend.md) · [`README.md`](../README.md) |
| Contrato | Swagger em `/docs`, gerado a partir do código |

---

## Nicholas Scoz dos Santos — DevOps

**Atividades realizadas**

- Configuração do repositório: branch `develop` como padrão
- Proteção de branch na `main` e na `develop`, exigindo 1 aprovação por PR
- Revisão de código do PR #1

**Evidências**

| | |
|---|---|
| Proteção | `main` e `develop` com `required_approving_review_count: 1` |
| Revisão | PR [#1](https://github.com/mendoncaluucas/ViaCar/pull/1) — estrutura inicial do backend |
| Commit | Merge do PR #1 |

> Pendente da área, registrado como **DT-15**: ESLint, Prettier e integração contínua. O PR [#12](https://github.com/mendoncaluucas/ViaCar/pull/12) traz o workflow de CI pronto, com os checks verdes, aguardando merge.

---

## Números do repositório

| | |
|---|---|
| Período | 10/09/2026 20:12 → 17/09/2026 11:01 |
| Commits | 39 |
| Pull requests | 12 — 11 mergeados, 1 aberto |
| Arquivos versionados | 106 |
| Testes automatizados | 143, em 9 arquivos |
| Regras de negócio | 10 de 10 implementadas |

---

## Observações de processo

**Revisão de código.** O Definition of Done da equipe exige aprovação de outro desenvolvedor. Três dos doze PRs tiveram revisão registrada (#1, #3 e #7). Os demais foram mergeados por bypass do administrador, por restrição de prazo — a proteção de branch existia e funcionava; o que faltou foi o tempo de revisão. Fica registrado como débito de processo.

**Linter.** A Seção 6.3 do acordo condiciona a aprovação de PR ao linter. Como ESLint e Prettier não chegaram a ser configurados (DT-15), a regra ficou inaplicável durante todo o N1.
