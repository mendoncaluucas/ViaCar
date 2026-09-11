# ViaCar — Débitos Técnicos e Instruções para o Próximo Grupo

> Última revisão: 11/09/2026 (após o D2)
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
| DT-10 | Testes automatizados ainda não escritos | Regressão passa batido | Vitest sobre as RNs — previsto para o D6 |

---

## 3. ⚠️ Armadilhas — leia antes de programar

São comportamentos **verificados empiricamente**, não suposições. Cada um já foi testado contra o banco real.

### 3.1. `UNIQUE (rota_id, data_partida)` NÃO significa "uma carona por dia"

`data_partida` é `timestamptz`. Duas caronas da mesma rota no mesmo dia, com **1 milissegundo de diferença**, passam as duas pela constraint. Testado e confirmado.

> **Regra obrigatória:** `data_partida` **nunca** é gravada como veio do cliente. O service recebe a data desejada, descarta a hora e recompõe o timestamp a partir de `rota.horario_partida`. Assim duas requisições para o mesmo dia produzem exatamente o mesmo valor e a constraint funciona.

### 3.2. Veículo inativado continua encontrável por id

`GET /veiculos/:id` não filtra `ativo`, o que é correto — caronas passadas precisam exibir o carro. Mas significa que **nada impede publicar carona com veículo já removido**.

> **Regra obrigatória:** ao criar carona, validar `veiculo.ativo === true` além da posse. A trigger do banco não cobre isso.

### 3.3. Hora do dia é `TIME`, não string

`rota.horario_partida` é `TIME` no Postgres. O Prisma devolve `Date` ancorado em `1970-01-01`. Testado em máquina UTC-3: o round-trip com `shared/utils/horario.ts` preserva `"07:30"` corretamente.

> **Regra obrigatória:** sempre converter com `horaParaTexto()` e `textoParaHora()`. Nunca formatar esse `Date` com `toLocaleTimeString()` ou com a data completa — aí sim o fuso entra e o horário anda.

### 3.4. `vagasDisponiveis` é calculado, nunca coluna

`vagasOfertadas - COUNT(reservas CONFIRMADA)`. Não crie coluna para isso: ela dessincroniza no primeiro cancelamento.

### 3.5. A RN-02 precisa de transação com lock

Duas pessoas reservando a última vaga ao mesmo tempo passam as duas por um `if (count < vagas)` ingênuo.

> **Regra obrigatória:** `prisma.$transaction` com `SELECT ... FOR UPDATE` na linha da carona antes de contar e inserir. O índice parcial `reserva_confirmada_unica_por_carona` é a rede de segurança, não a solução — ele impede reserva duplicada do mesmo passageiro, não o overbooking entre passageiros diferentes.

### 3.6. Nada é apagado de verdade

Não existe `onDelete: Cascade` em lugar nenhum do schema — de propósito. Usuário e veículo são desativados (`ativo = false`). Apagar em cascata destruiria o histórico de caronas, que é exatamente a base da pontuação (N2) e da avaliação de conduta (N3).

> Tentar `DELETE` num usuário com histórico devolve `P2003` e é traduzido para HTTP 409. Isso é o comportamento desejado, não um bug.

### 3.7. Os status `REALIZADA` e `NAO_COMPARECEU` não são decoração

`StatusReserva` já prevê os dois. Eles existem para alimentar pontos e conduta no N2/N3. **Não remova do enum** — remover exige migration destrutiva depois.

---

## 4. Por onde começar o N2/N3

O DER das tabelas de evolução (`EXTRATO_PONTOS`, `AVALIACAO`, `RESGATE`) já está desenhado em [modelagem-dados.md](modelagem-dados.md), seção 4, com as decisões justificadas — inclusive por que saldo de pontos é derivado do extrato e não coluna em `usuario`.

A estrutura em módulos (`controller` → `service` → Prisma) foi montada para que pontuação e avaliação entrem como módulos novos, sem reescrever o que existe. Regra de negócio mora no `service`; se você está escrevendo `if` de negócio dentro de um `controller`, parou no lugar errado.
