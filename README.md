# ViaCar — Gestão de Caronas Corporativas

Sistema para incentivar caronas compartilhadas entre funcionários de uma empresa.
Motoristas cadastram suas rotas e ofertam vagas; colegas do mesmo bairro reservam a vaga
em vez de gastar com transporte.

**Case 14** · Centro Universitário Católica de Santa Catarina · Equipe Draft

---

## Stack

| Camada | Tecnologia |
|---|---|
| Backend | Node.js 22 · TypeScript · Express · Prisma |
| Banco | PostgreSQL 16 (Docker) |
| Frontend | React · TypeScript · Vite |
| Documentação da API | Swagger UI |

## Pré-requisitos

- [Node.js 22+](https://nodejs.org)
- [Docker Desktop](https://www.docker.com/products/docker-desktop/)
- [Git](https://git-scm.com)

## Como rodar

São duas aplicações: a API e a interface. Cada uma no seu terminal.

### 1. Clone o repositório

```bash
git clone https://github.com/mendoncaluucas/ViaCar.git
cd ViaCar
```

### 2. Suba o banco

```bash
cd backend
cp .env.example .env
docker compose up -d
```

O Postgres sobe na porta **5433**, e não na 5432, para não conflitar com outro Postgres que você já tenha na máquina. Junto vem o [Adminer](http://localhost:8080) (usuário `viacar`, senha `viacar`, banco `viacar`), caso queira olhar as tabelas direto.

O `.env.example` já vem preenchido e funciona como está. Para um trabalho de faculdade não há problema — mas o `JWT_SECRET` dele é um valor de exemplo, e num ambiente real seria trocado.

### 3. Suba a API

Ainda em `backend/`:

```bash
npm install
npx prisma migrate deploy
npm run seed
npm run dev
```

> Use `migrate deploy`, não `migrate dev`. O `deploy` só aplica as migrations que já existem, que é o que você quer aqui. O `dev` serve para **criar** migration nova e pode abrir prompt interativo.

O `seed` popula o banco com 6 funcionários, 2 veículos, 3 rotas, 3 caronas e 5 reservas — inclusive uma carona já lotada e uma reserva cancelada, para dar o que ver na tela sem precisar cadastrar nada. Ele **apaga** os dados existentes antes de gravar, e se recusa a rodar com `NODE_ENV=production`.

API em `http://localhost:3333` · Contrato navegável em **`http://localhost:3333/docs`**

Confira com:

```bash
curl http://localhost:3333/health
```

Deve responder `"banco":"conectado"`. Se responder erro, o container do Postgres ainda está subindo — espere alguns segundos.

### 4. Suba a interface

Em **outro terminal**, a partir da raiz do repositório:

```bash
cd frontend
npm install
npm run dev
```

Interface em `http://localhost:5173`. A API precisa estar rodando — o `CORS_ORIGIN` do backend já libera essa porta.

### 5. Entre

A senha de todos os usuários do seed é **`viacar123`**.

| E-mail | Bairro | Serve para demonstrar |
|---|---|---|
| `vinicius@viacar.com.br` | Costa e Silva | Motorista com Civic de 4 lugares e duas caronas abertas |
| `nicholas@viacar.com.br` | Bucarein | Motorista com Onix de 3 lugares e uma carona lotada |
| `henrique@viacar.com.br` | Costa e Silva | Passageiro sem nenhuma reserva — o melhor para demonstrar o fluxo do zero |
| `willian@viacar.com.br` | Costa e Silva | Passageiro com reserva confirmada |
| `kaua@viacar.com.br` | Bucarein | Passageiro com reserva cancelada (mostra que a vaga voltou) |
| `lucas@viacar.com.br` | Iririu | Passageiro |

Entrando como **Vinicius**, a busca aparece vazia — e está correto: as duas caronas abertas são dele, e a busca esconde as próprias (RN-04). Para ver a busca com resultado, entre como **Henrique**.

### O que dá para ver funcionando

| Regra | Como reproduzir |
|---|---|
| **RN-01** (a do case) | Como Vinicius, abra uma carona com 6 vagas no Civic de 4 lugares. Resposta: `422` dizendo qual carro é, quanto ele comporta e quanto foi pedido |
| **RN-02** | Reserve a última vaga de uma carona. Ninguém mais consegue entrar, nem com requisições simultâneas |
| **RN-06 / RN-07** | Ao encher, a carona vira `LOTADA` e some de `GET /caronas`. Cancele uma reserva e ela reaparece |
| **RN-08** | Cancele uma carona com passageiros e as reservas são canceladas junto |

## Testes

```bash
cd backend
npm test
```

Roda contra um banco **separado** (`viacar_test`), criado e migrado automaticamente na primeira execução — os dados de desenvolvimento não são tocados. Exige apenas que o container do Postgres esteja de pé.

| Comando | O que faz |
|---|---|
| `npm test` | Executa a suíte uma vez |
| `npm run test:watch` | Reexecuta a cada alteração |
| `npm run typecheck` | Verifica os tipos de `src`, `tests` e `prisma` |

## Estrutura do repositório

```
backend/    API REST (Node + Express + Prisma)
frontend/   Interface web (React + Vite)
docs/       Plano de ação, DER, guia de estilo e débitos técnicos
```

## Documentação

| Documento | Conteúdo |
|---|---|
| [docs/modelagem-dados.md](docs/modelagem-dados.md) | DER, dicionário de dados e as 10 regras de negócio |
| [docs/plano-acao-backend.md](docs/plano-acao-backend.md) | Escopo, contrato da API e cronograma |
| [docs/guia-de-estilo.md](docs/guia-de-estilo.md) | Padrões de código (Seção 5 do Acordo de Equipe) |

## Fluxo de trabalho

- **Branches:** `main` (estável) · `develop` (integração) · `feature/nome-da-funcionalidade` · `fix/descricao-do-bug`
- **Commits:** Conventional Commits — `feat:` `fix:` `refactor:` `docs:` `chore:`
- **Definition of Done:** Pull Request aprovado por outro dev + validado pelo QA + merge na branch principal

## Equipe

| Papel | Responsável |
|---|---|
| Product Owner | Vinicius Steuernagel |
| Engenheiro de Requisitos | Henrique Cordeiro de Oliveira |
| Quality Assurance | Kaua Lucindo |
| Desenvolvedor Frontend | Willian Squena |
| Desenvolvedor Backend | Lucas Rogério Mendonça |
| DevOps | Nicholas Scoz dos Santos |
