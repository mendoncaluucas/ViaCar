# ViaCar — Plano de Ação do Backend (N1)

> **Responsável:** Lucas Rogério Mendonça — Desenvolvedor Backend
> **Equipe:** Draft · Case 14 — Gestão de Caronas Corporativas
> **Janela:** 10/09/2026 (qui) → 17/09/2026 (qui) · 7 dias
> **Stack:** Node.js 20 + TypeScript · Express · Prisma · PostgreSQL 16 (Docker) · JWT · Zod · Vitest · Swagger

---

## 0. Onde estão os pontos (e onde o backend entra)

| Critério N1 | Pts | O backend responde por |
|---|---|---|
| Execução do Sistema — compila e roda o case sem travar | **3,0** | ✅ Tudo. É o item mais caro da prova. |
| Qualidade do Código inicial — pastas, nomes, sem código morto | **1,0** | ✅ Estrutura em módulos + guia de estilo |
| README, DER e coleção da API (Postman/Swagger) | **2,0** | ✅ DER e Swagger são meus; README eu escrevo com o DevOps |
| Relatório de débitos técnicos + instruções pro próximo grupo | **1,0** | ✅ Registro conforme desenvolvo (não no último dia) |
| Pitch + matriz de papéis | 3,0 | ➖ Do PO, mas eu entrego o roteiro da demo técnica |

**Leitura:** ~6,0 dos 10,0 passam por mim. A prioridade nº 1 é *rodar sem travar* — funcionalidade a menos custa menos que uma demo que quebra na frente da banca.

---

## 1. Escopo da N1 — o que entra e o que NÃO entra

### Entra (o case pede)

- Cadastro/login de funcionário (JWT)
- Cadastro de veículo com `capacidade_passageiros`
- Cadastro de rota (origem / destino / horário / dias da semana)
- Abertura de carona com oferta de vagas — **RN-01 crítica aqui**
- Busca de caronas abertas (filtro por bairro de origem, data e sentido) — é o que ataca o problema real do case: "colegas do mesmo bairro gastam com transporte"
- Reserva de vaga pelo passageiro — **RN-02 sem overbooking**
- Cancelamento de reserva (libera a vaga) e de carona (cascata)

### NÃO entra (é N2/N3 — modelado, não implementado)

- Acúmulo de pontos e voucher de combustível/folga
- Avaliação de conduta motorista/passageiro
- Geolocalização, rota no mapa, cálculo de distância
- Notificações / e-mail / push

> Escopo travado. Ideia nova durante a semana vai pro backlog como débito, não pro código.

---

## 2. Contrato da API (entregar ao Willian no D2, não no D6)

O frontend não pode ficar bloqueado esperando meu código. **No D2 eu publico o Swagger com os endpoints e os schemas, mesmo com as rotas ainda respondendo mock.** Assim ele desenvolve em paralelo.

```
POST   /auth/registrar                 cria funcionário
POST   /auth/login                     → { token, usuario }

GET    /usuarios/me                    perfil do logado
PATCH  /usuarios/me

POST   /veiculos                       RN: capacidade 1..8
GET    /veiculos                       meus veículos
PATCH  /veiculos/:id
DELETE /veiculos/:id                   inativa (soft delete)

POST   /rotas                          origem/destino/horário/dias
GET    /rotas                          minhas rotas
GET    /rotas/:id
PATCH  /rotas/:id
DELETE /rotas/:id

POST   /caronas                        ⚠ RN-01 — vagas <= capacidade do veículo
GET    /caronas                        ?bairroOrigem=&data=&sentido=  (busca pública)
GET    /caronas/:id                    inclui vagasDisponiveis e lista de passageiros
PATCH  /caronas/:id                    alterar vagas → revalida RN-01
POST   /caronas/:id/cancelar           RN-08 cascata
GET    /caronas/minhas                 como motorista

POST   /caronas/:caronaId/reservas     ⚠ RN-02 — transação + FOR UPDATE
DELETE /reservas/:id                   cancelar → RN-06 libera vaga
GET    /reservas/minhas                como passageiro
```

**Padrão de erro (fechar no D1 e não mudar depois):**

```json
{ "erro": "REGRA_NEGOCIO", "mensagem": "Veículo Civic ABC1D23 comporta 4 passageiros; foram oferecidas 6 vagas.", "campo": "vagasOfertadas" }
```

| Código | Quando |
|---|---|
| 400 | payload inválido (Zod) |
| 401 | sem token / token expirado |
| 403 | token válido, mas o recurso é de outro usuário |
| 404 | recurso não existe |
| 409 | conflito de estado (reserva duplicada, horário conflitante) |
| 422 | violação de regra de negócio (RN-01, RN-02, RN-04, RN-05) |

---

## 3. Estrutura de pastas (vale 1,0 no critério de qualidade)

```
viacar-api/
├── docker-compose.yml            postgres + adminer
├── .env.example                  NUNCA commitar o .env real
├── package.json
├── tsconfig.json
├── prisma/
│   ├── schema.prisma
│   ├── migrations/
│   └── seed.ts                   dados de demo (ver §5)
├── src/
│   ├── server.ts                 sobe o HTTP
│   ├── app.ts                    monta express + middlewares + rotas
│   ├── config/
│   │   ├── env.ts                valida variáveis de ambiente no boot
│   │   └── prisma.ts             instância única do client
│   ├── modules/
│   │   ├── auth/                 controller · service · routes · schema
│   │   ├── usuarios/
│   │   ├── veiculos/
│   │   ├── rotas/
│   │   ├── caronas/              ⚠ aqui mora a RN-01
│   │   └── reservas/             ⚠ aqui mora a RN-02
│   ├── shared/
│   │   ├── errors/               AppError + tratador central
│   │   ├── middlewares/          autenticar · validar · tratarErros
│   │   └── utils/
│   └── docs/swagger.ts
├── tests/
│   └── regras-negocio/           RN-01, RN-02, RN-04, RN-06
└── docs/
    ├── modelagem-dados.md        DER
    ├── guia-de-estilo.md
    ├── debitos-tecnicos.md
    └── ViaCar.postman_collection.json
```

**Regra por módulo:** `controller` só traduz HTTP ↔ service. `service` tem a regra de negócio e é o único que fala com o Prisma. Nenhuma regra de negócio dentro de controller — é isso que faz o próximo grupo conseguir mexer.

---

## 4. Cronograma — 7 dias

| Dia | Data | Entrega | Status |
|---|---|---|---|
| **D1** | 10/09 qui | Repo criado, `docker-compose up` sobe o Postgres, `schema.prisma` **completo**, 1ª migration rodando, `GET /health` no ar, estrutura de pastas vazia porém criada | ☑ |
| **D2** | 11/09 sex | Auth (registrar/login/JWT) + middleware `autenticar` + CRUD de veículos com CHECK de capacidade. **Swagger publicado e mandado pro Willian.** | ☑ |
| **D3** | 12/09 sáb | CRUD de rotas + `POST /caronas` com **RN-01 implementada e testada**. Primeiro teste automatizado. | ☑ |
| **D4** | 13/09 dom | Reservas: criar (**RN-02 com transação**), cancelar (RN-06), cascata (RN-08). O coração do sistema fecha aqui. | ☑ (feito em 16/09) |
| **D5** | 14/09 seg | Busca com filtros (`GET /caronas?bairroOrigem=`), `seed.ts` com dados de demo, coleção Postman exportada. **Integração real com o front.** | ☐ |
| **D6** | 15/09 ter | Testes das RNs, `README.md` passo a passo, `debitos-tecnicos.md`, DER exportado em imagem, apoio ao Kaua no roteiro de teste. | ☐ |
| **D7** | 16/09 qua | **Congelamento de código.** Só correção de bug crítico. Ensaio do pitch com demo rodando do zero em máquina limpa. | ☐ |
| — | 17/09 qui | Entrega / apresentação | ☐ |

> **Como ficou na prática.** O D3 puxou para dentro dele a busca com filtros e o `seed.ts` que estavam no D5, e a suíte de testes que estava no D6 — as três coisas foram feitas junto com o código que elas verificam, não depois. O D4 escorregou de 13/09 para 16/09 por causa de duas rodadas de revisão entre o D3 e ele, que renderam quatro correções de borda (DT-17 a DT-20). Do D5 restam a **coleção Postman** — dispensável, o Swagger em `/docs` cobre o mesmo e está sempre em dia com o código — e a **integração real com o front**, que é o que sobra para o D7. A RN-10, que era opcional, entrou.

### Marcos que não podem escorregar

- **Fim do D1:** o banco tem que estar de pé. Se o schema não fechar hoje, o resto da semana derrete.
- **Fim do D4:** o fluxo `cadastrar rota → abrir carona → reservar vaga` roda ponta a ponta no Postman. Isso é o mínimo demonstrável na banca.
- **D7 é congelamento, não desenvolvimento.** Se sobrar tempo, vira teste e documentação — não feature.

### Regra de corte (se atrasar)

Corta nesta ordem, sem dó: **RN-10** → `PATCH` de rota/veículo → filtros extras da busca → soft delete. **Nunca** corte: RN-01, RN-02, README, DER.

---

## 5. Seed de demonstração (não improvisar isso no dia do pitch)

O `prisma/seed.ts` cria um cenário que demonstra o case inteiro em 1 comando:

- 6 funcionários (nomes do time), 3 deles em Costa e Silva e 2 no Bucarein
- 2 veículos: um Civic (`capacidade_passageiros = 4`) e um Onix (`= 3`)
- 2 rotas IDA (07:00 e 07:30) e 1 VOLTA (17:40)
- 3 caronas abertas nos próximos dias, uma delas **já lotada** (pra demonstrar RN-02 ao vivo)
- 4 reservas confirmadas + 1 cancelada (pra mostrar que a vaga voltou)

Na demo o roteiro é: **abrir carona com 6 vagas num carro de 4 → erro 422 explícito** (RN-01, o item destacado do case) → corrigir pra 4 → passageiro reserva → tentar reservar de novo → 409 → outro passageiro pega a última vaga → carona vira `LOTADA` → sexto tenta e leva 409.

---

## 6. Débitos técnicos previstos (registrar conforme surgem, não no final)

Vale 1,0 ponto e é o que o próximo grupo vai ler. Já dá pra prever:

| ID | Débito | Impacto | Sugestão pro próximo grupo |
|---|---|---|---|
| DT-01 | RN-01 validada só na aplicação, sem trigger no banco | Escrita direta no banco fura a regra | Criar `TRIGGER BEFORE INSERT OR UPDATE ON carona` |
| DT-02 | Listagens sem paginação | Trava com volume real | Adicionar `?pagina=&limite=` e retornar `total` |
| DT-03 | JWT sem refresh token e sem política de senha | Sessão expira e o usuário perde o contexto | Implementar refresh + regra mínima de senha |
| DT-04 | `bairro` é texto livre, não normalizado | "Costa e Silva" ≠ "costa e silva" quebra a busca | Tabela `bairro` ou normalização na entrada |
| DT-05 | Sem job para virar carona `ABERTA` → `EM_ANDAMENTO`/`CONCLUIDA` | Status muda na mão | Agendador (node-cron) ou mudança sob demanda |
| DT-06 | Recorrência de rota é simplificada (`dias_semana`) | Não trata feriado nem exceção | Tabela de exceções de calendário |
| DT-07 | Testes cobrem regras de negócio, não cobrem end-to-end | Regressão em controller passa batido | Supertest nos fluxos principais |

---

## 7. Dependências com o resto do time

| De quem | O que eu preciso | Quando |
|---|---|---|
| Henrique (Requisitos) | Validar as 10 RNs deste plano e confirmar que nenhuma regra do case ficou de fora | **até D2** |
| Willian (Frontend) | Confirmar que o contrato da API atende as telas dele | **D2**, quando eu publicar o Swagger |
| Nicholas (DevOps) | Repo no GitHub com branch protection na `main`, `develop` criada, template de PR | **D1** |
| Kaua (QA) | Ler as RNs e montar o roteiro de teste em cima delas | D3 → executa D6 |
| Vinicius (PO) | Bater o martelo no escopo da §1 e receber os débitos pro backlog | **D1** |

### O que eu devo ao time

- **D2:** Swagger publicado (destrava o Willian)
- **D3:** RNs documentadas e estáveis (destrava o Kaua)
- **D5:** seed rodando (destrava a demo do Vinicius)
- **D6:** README passo a passo (destrava qualquer um que clone o projeto)

---

## 8. Compromissos do Acordo de Equipe que valem pra mim

Do `Acordo de Manutenibilidade e Engenharia de Software` (13/08/2026):

- **Sou o responsável pela Seção 5 — Guia de Estilo e Padrões de Código.** A seção ainda está com os textos de exemplo. Preencher é tarefa minha do D1 → ver [guia-de-estilo.md](guia-de-estilo.md).
- **DoD:** nada é "concluído" sem Pull Request aprovado por outro dev, validação do QA e merge na branch principal. **Não commitar direto na `main`.**
- **Branches:** `feature/nome-da-funcionalidade` e `fix/descricao-do-bug`.
- **Commits:** Conventional Commits — `feat`, `fix`, `refactor`, `docs`.
- **Débito técnico:** todo atalho vira issue/card do tipo *Débito Técnico* no backlog, na hora.
- **Manutenibilidade:** funções com responsabilidade única, teto de 30 linhas sem justificativa, e **proibido `catch` vazio** — todo erro tratado ou registrado.

---

## 9. Primeira ação (agora)

```
1. Criar o repositório e a branch develop
2. docker-compose.yml com Postgres 16
3. npm init + typescript + express + prisma + zod
4. schema.prisma com as 5 tabelas da modelagem
5. npx prisma migrate dev --name estrutura-inicial
6. GET /health respondendo 200
```

Fechou isso hoje, a semana é viável.
