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

> Em construção — passo a passo completo entra no D6 (15/09).

```bash
git clone https://github.com/mendoncaluucas/ViaCar.git
cd ViaCar/backend
cp .env.example .env
docker compose up -d
npm install
npx prisma migrate dev
npm run seed
npm run dev
```

API em `http://localhost:3333` · Swagger em `http://localhost:3333/docs`

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
