# ViaCar — Débitos Técnicos e Instruções para o Próximo Grupo

> Última revisão: 11/09/2026 (fechamento do D3)
> Responsável pelo registro: Lucas Rogério Mendonça — Desenvolvedor Backend

Este documento registra atalhos assumidos, limites conhecidos e as armadilhas que já custaram tempo. Se você está pegando o projeto para continuar no N2/N3, **leia a seção 3 antes de escrever qualquer linha** — ela lista o que quebra silenciosamente.

---

## 1. Resolvidos (ficam registrados porque explicam decisões do código)

### DT-01 — RN-01 validada só na aplicação · **RESOLVIDO no D1**

A regra crítica do case (*o motorista não pode oferecer mais vagas do que a capacidade do veículo*) cruza duas tabelas, então `CHECK` do Postgres não alcança. Estava previsto valer só no service.

**Como foi resolvido:** a migration `constraints_regras_negocio` cria a trigger `carona_valida_capacidade`, que barra `INSERT` e `UPDATE` na tabela `carona`. A regra agora vale inclusive para escrita direta no banco — seed, script ou console.

**Verificado:** inserção de 6 vagas em veículo de capacidade 4, direto no `psql`, é rejeitada.

### DT-08 — Erro de banco chegava como HTTP 500 · **RESOLVIDO no D2**

Descoberto na revisão pré-commit do D2. Violação de constraint chega ao Node de duas formas diferentes:

| Origem | Classe do erro | Reconhecível? |
|---|---|---|
| `UNIQUE`, FK, registro inexistente | `PrismaClientKnownRequestError` | sim, via `code` (P2002, P2003, P2025) |
| `CHECK` e **trigger** | `PrismaClientUnknownRequestError` | não — código e mensagem ficam embutidos no texto |

O segundo caso é justamente o da trigger da RN-01. Sem tratamento, o motorista que tentasse ofertar vagas demais receberia *"Erro inesperado no servidor"* em vez da mensagem correta.

**Como foi resolvido:** `shared/errors/traduzir-erro-do-banco.ts` traduz os dois formatos para o envelope da API. Mensagens de trigger prefixadas com `RN-` são repassadas ao usuário; qualquer outro `CHECK` vira mensagem genérica, para não vazar nome de coluna e de constraint.

### DT-11 — Placa ficava bloqueada para sempre após remover o veículo · **RESOLVIDO**

Achado na revisão anterior ao D3. Como a remoção é lógica (`ativo: false`) e a placa continua ocupando o índice único, o funcionário que removesse o próprio carro levava `409` para sempre ao tentar recadastrá-lo — e o carro nem aparecia na listagem, que filtra `ativo: true`. Beco sem saída.

**Como foi resolvido:** `criar()` agora distingue três casos — placa de outro funcionário (409), veículo próprio ainda ativo (409) e **veículo próprio removido (reativa o registro existente)**.

A reativação mantém o **mesmo `id`** de propósito: um `create` novo dividiria o histórico de caronas entre dois registros do mesmo carro físico.

### DT-12 — Filtro de data divergente entre `atualizar()` e `inativar()` · **RESOLVIDO**

`inativar()` só considerava caronas futuras; `atualizar()` considerava qualquer carona. Combinado com o DT-09 (não existe job que mova `ABERTA` → `CONCLUIDA`), uma carona da semana passada parada em `ABERTA` **travaria a redução de capacidade do veículo para sempre**.

**Como foi resolvido:** os dois métodos usam `caronasFuturasEmUso(veiculoId)`, que centraliza o recorte por status e por data.

### DT-13 — `carona.veiculo_id` sem índice · **RESOLVIDO**

O Postgres não cria índice automático para chave estrangeira (diferente do MySQL), e as duas checagens de "este veículo tem carona?" filtram por essa coluna. Migration `indice_carona_veiculo`. Confirmado com `EXPLAIN`: o planejador usa `carona_veiculo_id_idx`.

### DT-10 — Sem testes automatizados · **RESOLVIDO para D1/D2**

`npm test` retornava exit code 1 (*"No test files found"*), o que deixaria o CI vermelho no primeiro build, e nenhuma rede protegia refatoração.

**Como foi resolvido:** suíte com **97 testes** rodando em ~9 s, contra um **banco de verdade** (`viacar_test`), não contra mocks. A decisão é deliberada: as regras mais críticas — a trigger da RN-01 e o índice parcial da RN-02 — **vivem dentro do banco**, e um mock provaria nada sobre elas.

| Arquivo | Cobre |
|---|---|
| `tests/shared/horario.test.ts` | Fuso, e a garantia que sustenta o `UNIQUE` da carona |
| `tests/regras-negocio/rn-01-capacidade.test.ts` | Trigger da RN-01, CHECKs, índice parcial, proteção do histórico |
| `tests/regras-negocio/rn-02-concorrencia.test.ts` | Trava contra overbooking e composição em transação |
| `tests/regras-negocio/veiculo.test.ts` | DT-11, DT-12, posse e remoção lógica |
| `tests/regras-negocio/rota.test.ts` | Conversão de horário, posse e remoção com carona agendada |
| `tests/regras-negocio/carona.test.ts` | RN-01 no serviço, RN-03, RN-09, busca e cancelamento |
| `tests/regras-negocio/auth.test.ts` | Cadastro, hash de senha, e a mensagem genérica de login |

**Ainda falta:** os endpoints de reserva do D4. Escrever junto com o código, não depois.

**Trava de segurança:** a suíte dá `TRUNCATE` nas tabelas antes de cada teste. Dois pontos do código recusam rodar se `DATABASE_URL` não contiver `_test` — apontar para o banco de desenvolvimento apagaria os dados do dia.

### DT-14 — `prisma/seed.ts` fora da verificação de tipos · **RESOLVIDO**

O `tsconfig.json` incluía apenas `src/**/*.ts`. Como o seed roda via `tsx`, que apaga os tipos sem verificar, um erro de tipo ali só apareceria em execução.

**Como foi resolvido:** o `tsconfig.json` passou a verificar `src`, `tests` e `prisma`, e o `npm run build` usa um `tsconfig.build.json` separado que emite só `src`. Na primeira execução com a nova configuração apareceram **11 erros latentes no seed** — todos corrigidos.

### DT-17 a DT-20 — Bordas encontradas no fechamento do D3 · **RESOLVIDOS**

Quatro defeitos que não aparecem no caminho feliz, todos reproduzidos contra o banco antes da correção.

| ID | Defeito | Correção |
|---|---|---|
| DT-17 | Alterar `rota.horario_partida` entre duas aberturas permitia **duas caronas da mesma rota no mesmo dia** — o índice comparava o instante | Índice passou a comparar o dia-calendário (ver armadilha 3.1) e o service checa por intervalo de dia, não por instante |
| DT-18 | **Rota removida continuava abrindo carona.** A rota sumia da lista do motorista, mas as caronas dela seguiam aparecendo na busca dos colegas | `carregarRotaUtilizavel()` em `carona.service.ts`, espelhando o que já existia para veículo |
| DT-19 | **Datas inexistentes eram aceitas e roladas em silêncio.** `2026-02-30` virava 02/03; `2027-02-29` virava 01/03. O `Date.parse` rola o excedente em vez de recusar | Validação por ida e volta no `carona.schema.ts`: `new Date(...).toISOString().slice(0,10) === valor` |
| DT-20 | **Cancelar carona já partida apagava o histórico.** O cancelamento em cascata marcava as reservas como `CANCELADA`, destruindo o registro de quem de fato viajou — base da pontuação (N2) e da conduta (N3) | `cancelar()` recusa carona cujo `dataPartida` já passou, com mensagem apontando `REALIZADA` / `NAO_COMPARECEU` |

---

## 2. Débitos abertos

| ID | Débito | Impacto | Como pagar |
|---|---|---|---|
| DT-02 | Listagens sem paginação | Trava com volume real | `?pagina=&limite=` e devolver `total` no corpo |
| DT-03 | JWT sem refresh token | Sessão de 8h morre e o usuário perde o contexto | Endpoint de refresh + rotação |
| DT-04 | Sem política de força de senha | Aceita `12345678` | Regra mínima no `registrarSchema` |
| DT-05 | Sem rate limit no `/auth/login` | Força bruta sem obstáculo | `express-rate-limit` por IP e por e-mail |
| DT-06 | `bairro` é texto livre | "Costa e Silva" ≠ "costa e silva" quebra a busca de caronas | Tabela `bairro` ou normalização na entrada |
| DT-07 | Recorrência de rota é simplificada (`diasSemana`) | Não trata feriado nem exceção | Tabela de exceções de calendário |
| DT-09 | Sem job de transição de status da carona | `ABERTA` → `EM_ANDAMENTO` → `CONCLUIDA` na mão | Agendador, ou transição sob demanda na leitura |
| DT-15 | ESLint e Prettier não configurados | A Seção 6.3 do acordo condiciona aprovação de PR ao linter — hoje é inaplicável | `@typescript-eslint` + Prettier + passo no CI (**DevOps**) |
| DT-16 | Sem `helmet` nem cabeçalhos de segurança | Respostas sem proteção básica de browser | `app.use(helmet())` |

### Achados do fechamento do D3, adiados de propósito

Levantados na revisão de fechamento do D3 e classificados como recomendados, não obrigatórios. **Decisão do time: fazer depois que todas as fases estiverem entregues**, para não gastar tempo de implementação em polimento antes da N1.

| ID | Débito | Onde | Impacto | Como pagar |
|---|---|---|---|---|
| DT-21 | Dois `as Prisma.RotaUncheckedCreateInput` / `UncheckedUpdateInput` | `rota.service.ts:62` e `:93` | São os **únicos** escapes do TS estrito no projeto inteiro. Se o helper genérico `paraDadosDoBanco` divergir do tipo do Prisma, o compilador fica calado | Tipar `paraDadosDoBanco` com o tipo de entrada correto e remover as duas asserções |
| DT-22 | `rota.service.atualizar()` não verifica `ativa` | `rota.service.ts` | Dá para editar uma rota já removida. Inofensivo hoje porque rota inativa não abre carona (DT-18), mas é inconsistente com `criar` | Espelhar a checagem de `carregarRotaUtilizavel()` |
| DT-23 | Visibilidade de `passageiros` não documentada | `GET /caronas/{id}`, `openapi.ts` | Qualquer funcionário autenticado vê a lista completa de passageiros de qualquer carona. É decisão defensável num app corporativo interno — o problema é ser **implícita** | Documentar no Swagger, ou restringir ao motorista e aos passageiros confirmados |

> Também fica pendente registrar no Swagger que `GET /caronas` filtra `status = ABERTA`, ou seja, esconde as `LOTADA` além das `CANCELADA`.

---

## 3. ⚠️ Armadilhas — leia antes de programar

São comportamentos **verificados empiricamente**, não suposições. Cada um já foi testado contra o banco real.

### 3.1. A unicidade da carona é por DIA, e vive fora do `schema.prisma`

"Uma carona por rota por dia" é garantida pelo índice `carona_unica_por_rota_e_dia`, criado à mão na migration homônima:

```sql
CREATE UNIQUE INDEX "carona_unica_por_rota_e_dia"
  ON "carona" ("rota_id", (("data_partida" AT TIME ZONE INTERVAL '-03:00')::date))
  WHERE "status" <> 'CANCELADA';
```

Três decisões embutidas aí, todas com motivo:

1. **Compara o dia-calendário, não o instante.** A versão anterior era `UNIQUE (rota_id, data_partida)` e tinha furo: bastava alterar `rota.horario_partida` entre duas aberturas para o mesmo dia aceitar duas caronas. Verificado contra o banco antes da correção.
2. **Ignora canceladas.** Sem isso, cancelar uma carona bloquearia aquele dia para sempre — reabrir geraria o mesmo instante e esbarraria na constraint.
3. **O fuso entra como `INTERVAL`, não como nome.** `AT TIME ZONE 'America/Sao_Paulo'` é `STABLE`, e o Postgres recusa expressão não-`IMMUTABLE` em índice. O offset fixo é correto porque o Brasil extinguiu o horário de verão em 2019.

> **Regras que continuam valendo:** `POST /caronas` recebe `data` como `"AAAA-MM-DD"`, nunca um instante — `"2026-09-15T22:00-03:00"` cai no dia 16 em UTC. E `data_partida` é sempre recomposta com `combinarDiaEHorario()` a partir de `rota.horario_partida`, nunca copiada do cliente.

**Não tente mover esse índice para o `schema.prisma`:** o Prisma não expressa índice único parcial nem índice sobre expressão.

### 3.2. Veículo inativado continua encontrável por id

`GET /veiculos/:id` não filtra `ativo`, o que é correto — caronas passadas precisam exibir o carro. Mas significa que **nada impede publicar carona com veículo já removido**.

> **Regra obrigatória:** ao criar carona, validar `veiculo.ativo === true` além da posse. A trigger do banco não cobre isso.

**Implementado no D3** em `carregarVeiculoUtilizavel()`, dentro de `carona.service.ts`, que checa existência, posse (RN-03) e `ativo` numa função só. Coberto por `carona.test.ts` ("recusa usar veículo já removido").

### 3.3. Hora do dia é `TIME`, não string

`rota.horario_partida` é `TIME` no Postgres. O Prisma devolve `Date` ancorado em `1970-01-01`. Testado em máquina UTC-3: o round-trip com `shared/utils/horario.ts` preserva `"07:30"` corretamente.

> **Regra obrigatória:** sempre converter com `horaParaTexto()` e `textoParaHora()`. Nunca formatar esse `Date` com `toLocaleTimeString()` ou com a data completa — aí sim o fuso entra e o horário anda.

### 3.4. Nunca valide query string escrevendo em `req.query`

No Express 5 `req.query` é um **getter**. Atribuir nele não lança erro — e também não tem efeito. Testado:

```json
{ "atribuicaoDireta": "permitida", "queryDepois": { "a": "1" } }
```

Ou seja: a validação rodaria, mas o valor normalizado pelo Zod (números convertidos, datas parseadas, defaults aplicados) seria **descartado em silêncio**, e o controller continuaria lendo strings cruas.

> **Regra obrigatória:** use `validarQuery(esquema)` na rota e `consultaValidada<T>(req)` no controller. O middleware escreve em `req.consulta`.

### 3.5. `vagasDisponiveis` é calculado, nunca coluna

`vagasOfertadas - COUNT(reservas CONFIRMADA)`. Não crie coluna para isso: ela dessincroniza no primeiro cancelamento.

### 3.6. A RN-02 precisa de transação com lock

Duas pessoas reservando a última vaga ao mesmo tempo passam as duas por um `if (count < vagas)` ingênuo.

> **Regra obrigatória:** `prisma.$transaction` com `SELECT ... FOR UPDATE` na linha da carona antes de contar e inserir. O índice parcial `reserva_confirmada_unica_por_carona` é a rede de segurança, não a solução — ele impede reserva duplicada do mesmo passageiro, não o overbooking entre passageiros diferentes.

**Medido contra o banco**, 4 pessoas disputando 1 vaga ao mesmo tempo:

| | Reservas confirmadas |
|---|---|
| Checagem ingênua (`if confirmadas < vagas`) | **4 para 1 vaga** |
| `$transaction` + `FOR UPDATE` | **1** |

**A ferramenta já existe:** `travarCaronaParaAtualizacao(tx, caronaId)` e `contarReservasConfirmadas(caronaId, db)`, em `carona.service.ts`. Coberto por `rn-02-concorrencia.test.ts`.

### 3.7. Nunca chame um service com o singleton de dentro de uma transação

`prisma.algumaCoisa()` executado dentro de `prisma.$transaction(async (tx) => ...)` roda **fora** da transação. O lock não protege aquela consulta, e o defeito só aparece sob concorrência.

> **Regra obrigatória:** toda função que pode ser chamada de dentro de uma transação recebe `db: ClientePrisma = prisma` como último parâmetro e usa `db`, nunca `prisma`. Já seguem esse padrão: `carregarCarona`, `carregarDoDono`, `contarReservasConfirmadas` e `carregarDoMotorista`.

### 3.8. Nada é apagado de verdade

Não existe `onDelete: Cascade` em lugar nenhum do schema — de propósito. Usuário e veículo são desativados (`ativo = false`). Apagar em cascata destruiria o histórico de caronas, que é exatamente a base da pontuação (N2) e da avaliação de conduta (N3).

> Tentar `DELETE` num usuário com histórico devolve `P2003` e é traduzido para HTTP 409. Isso é o comportamento desejado, não um bug.

### 3.9. Os status `REALIZADA` e `NAO_COMPARECEU` não são decoração

`StatusReserva` já prevê os dois. Eles existem para alimentar pontos e conduta no N2/N3. **Não remova do enum** — remover exige migration destrutiva depois.

---

## 4. Por onde começar o N2/N3

O DER das tabelas de evolução (`EXTRATO_PONTOS`, `AVALIACAO`, `RESGATE`) já está desenhado em [modelagem-dados.md](modelagem-dados.md), seção 4, com as decisões justificadas — inclusive por que saldo de pontos é derivado do extrato e não coluna em `usuario`.

A estrutura em módulos (`controller` → `service` → Prisma) foi montada para que pontuação e avaliação entrem como módulos novos, sem reescrever o que existe. Regra de negócio mora no `service`; se você está escrevendo `if` de negócio dentro de um `controller`, parou no lugar errado.
