# ViaCar — Handoff

> Case 14 — Gestão de Caronas Corporativas · Equipe Draft
> Versão entregue na N1 · 16/09/2026
> **Redação:** Henrique Cordeiro de Oliveira (Engenheiro de Requisitos), com revisão do PO e do Desenvolvedor Backend

Este documento existe para a equipe que vai **receber** o ViaCar. Ele responde a três perguntas: o que o sistema faz hoje, o que você precisa saber antes de mexer, e o que fazer primeiro.

---

## 1. O que é o sistema

Funcionários da mesma empresa moram nos mesmos bairros e fazem o mesmo trajeto todo dia, cada um por conta própria. O ViaCar conecta quem dirige com quem precisa de carona: o motorista cadastra sua rota recorrente e oferta as vagas livres do carro em cada dia; o colega do mesmo bairro reserva a vaga.

A regra que dá identidade ao case: **ninguém oferta mais vagas do que o carro comporta** — e, uma vez ofertadas, **ninguém reserva além delas**, nem com dois cliques simultâneos.

---

## 2. Mapa da documentação

Leia nesta ordem. Não comece pelo código.

| # | Documento | O que responde |
|---|---|---|
| 1 | [`requisitos.md`](requisitos.md) | O que o sistema faz, para quem, e por quê. Histórias de usuário e rastreabilidade |
| 2 | [`modelagem-dados.md`](modelagem-dados.md) | DER, dicionário de dados e as dez regras de negócio |
| 3 | [`debitos-tecnicos.md`](debitos-tecnicos.md) | O que ficou pendente, o que já foi resolvido e **as armadilhas — leia antes de programar** |
| 4 | [`guia-de-estilo.md`](guia-de-estilo.md) | Convenções de código adotadas |
| 5 | [`acordo-equipe.md`](acordo-equipe.md) | Processo de trabalho, DoR, DoD e fluxo de branches |
| 6 | [`plano-acao-backend.md`](plano-acao-backend.md) | Contrato da API e histórico do planejamento |
| — | `README.md` (raiz) | Como subir o projeto do zero |

O contrato vivo da API está em `http://localhost:3333/docs` (Swagger), gerado a partir do código — é ele que manda, não a lista do plano de ação.

---

## 3. Estado da entrega

### Funciona e é demonstrável
Cadastro e login com JWT · cadastro de veículo com capacidade · cadastro de rota recorrente · abertura de carona com validação da capacidade do veículo (RN-01) · busca de caronas abertas por bairro, data e sentido · reserva de vaga com controle de concorrência (RN-02) · cancelamento de reserva liberando a vaga · cancelamento de carona em cascata · transição automática entre `ABERTA` e `LOTADA`.

As dez regras de negócio (RN-01 a RN-10) estão implementadas, incluindo a RN-10, que era opcional.

### Modelado, mas não implementado
Pontuação e resgate de voucher/folga, avaliação de conduta, geolocalização, notificações e painel administrativo. O DER já contempla `EXTRATO_PONTOS`, `AVALIACAO` e `RESGATE`, e os enums de `RESERVA` já preveem `REALIZADA` e `NAO_COMPARECEU` — **não removam esses valores**, eles são a base da pontuação do N2.

### Não entregue
Coleção Postman (o Swagger cobre o mesmo e está sempre em dia com o código) e integração completa do frontend com a API.

---

## 4. O que você precisa saber antes de mexer

Três decisões explicam boa parte do código e não são óbvias:

1. **Papel é contextual, não é tipo de usuário.** Não existe tabela de motorista nem de passageiro. O mesmo funcionário é motorista na rota que criou e passageiro na reserva que fez, no mesmo dia. Qualquer tentativa de separar em dois cadastros quebra a pontuação do N2.
2. **`rota` e `carona` são coisas diferentes.** Rota é o trajeto recorrente, cadastrado uma vez. Carona é a viagem de um dia específico. É nela que o N2 vai pendurar pontos e avaliação.
3. **Vagas disponíveis é sempre calculado**, nunca guardado em coluna. Transformar em coluna cria duas fontes de verdade e dessincroniza no primeiro cancelamento.

E uma advertência prática: a regra crítica do case (RN-01) é validada **na aplicação, não no banco**. Escrita direta no banco — seed, script, migração — fura a regra. Está registrado como débito.

> A seção "Armadilhas" do `debitos-tecnicos.md` reúne os pontos onde o time já errou e corrigiu. Ler aquilo custa dez minutos e economiza dias.

---

## 5. Riscos conhecidos na recepção

| Risco | Impacto | Mitigação sugerida |
|---|---|---|
| RN-01 sem trigger no banco | Escrita fora da aplicação viola a regra central do case | Criar o trigger antes de qualquer script de carga |
| Bairro em texto livre | Variação de grafia quebra a busca, que é o coração do produto | Normalizar na entrada ou criar tabela de bairros |
| Sem job de transição de status da carona | Carona nunca vira `CONCLUIDA` sozinha, e sem isso não há o que pontuar no N2 | Resolver antes de começar a pontuação |
| ESLint e Prettier não configurados | A regra de aprovação de PR do acordo é hoje inaplicável | Configurar no primeiro ciclo |
| RN-10 não resiste a concorrência | Cenário raro, mas a regra pode ser furada | Índice parcial ou lock por passageiro |

---

## 6. Por onde começar

1. Suba o ambiente seguindo o `README.md` e rode o seed. Se `GET /health` responder com o banco conectado, está tudo certo.
2. Rode a suíte de testes (`npm test`). Ela deve passar inteira em máquina limpa — se não passar, o problema é de ambiente, e vale resolver antes de escrever qualquer linha.
3. Reproduza o roteiro de demonstração: abrir carona com mais vagas do que o carro comporta (erro esperado), corrigir, reservar, encher, tentar reservar de novo. Isso valida as duas regras críticas de uma vez.
4. Leia as armadilhas do `debitos-tecnicos.md`.
5. Só então escolha o primeiro débito a pagar. A sugestão do time: o trigger da RN-01 e a normalização de bairro, nessa ordem.

---

## 7. Checklist de aceite do projeto

Para a equipe receptora avaliar a viabilidade da recepção:

- [ ] O projeto sobe do zero em máquina limpa seguindo apenas o README
- [ ] A suíte de testes passa integralmente
- [ ] O Swagger em `/docs` corresponde ao comportamento observado na API
- [ ] O DER corresponde ao schema em `prisma/schema.prisma`
- [ ] As dez regras de negócio foram reproduzidas manualmente pelo menos uma vez
- [ ] Os débitos técnicos abertos foram lidos e incorporados ao backlog da equipe receptora
- [ ] As decisões de modelagem da seção 4 foram compreendidas e aceitas
- [ ] Há um responsável designado para cada seção do acordo de equipe

---

## 8. Contato

Dúvidas sobre requisitos e regras de negócio: Henrique Cordeiro de Oliveira (Engenheiro de Requisitos).
Dúvidas sobre implementação e banco: Lucas Rogério Mendonça (Desenvolvedor Backend).
Dúvidas sobre escopo e prioridade: Vinicius Steuernagel (Product Owner).
