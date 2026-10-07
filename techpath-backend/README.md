# TechPath Backend

API backend do TechPath, construída com [NestJS](https://nestjs.com).

## Tecnologias

- NestJS 12
- TypeScript
- PostgreSQL
- Vitest (testes unitários e e2e)
- oxlint / Prettier

## Pré-requisitos

- Node.js 22+
- npm
- PostgreSQL (via Docker Compose ou instância local)

## Variáveis de ambiente

Copie o arquivo [.env.example](.env.example) para `.env` e ajuste os valores conforme necessário:

```env
PORT=3000

POSTGRES_USER=techpath
POSTGRES_PASSWORD=techpath
POSTGRES_DB=techpath
POSTGRES_PORT=5432

NGINX_PORT=80
```

Ao rodar a API fora do Docker, defina também a `DATABASE_URL` apontando para o Postgres, por exemplo:

```env
DATABASE_URL=postgres://techpath:techpath@localhost:5432/techpath
```

## Como rodar localmente

1. Instalar as dependências:

```bash
npm install
```

2. Ter um Postgres disponível (local ou via `docker-compose up postgres`) e configurar a `DATABASE_URL`.

3. Rodar em modo desenvolvimento (watch):

```bash
npm run start:dev
```

A API fica disponível em [http://localhost:3000](http://localhost:3000).

## Scripts disponíveis

| Comando | Descrição |
| --- | --- |
| `npm run start` | Inicia a aplicação |
| `npm run start:dev` | Inicia em modo desenvolvimento (watch) |
| `npm run start:prod` | Inicia a partir do build (`dist/main`) |
| `npm run build` | Compila o projeto |
| `npm run lint` | Executa o oxlint |
| `npm run format` | Formata o código com Prettier |
| `npm run test` | Executa os testes unitários (Vitest) |
| `npm run test:watch` | Executa os testes em modo watch |
| `npm run test:cov` | Executa os testes com cobertura |
| `npm run test:e2e` | Executa os testes e2e |

## Endpoints de autenticação

### Usuário (questionário)

- `POST /users/register` — cadastra um novo usuário (`name`, `email`, `password`) e já retorna um `accessToken`.
- `POST /users/login` — autentica um usuário existente (`email`, `password`) e retorna um `accessToken`.

> Enquanto não há banco de dados configurado, os usuários cadastrados ficam em memória (`UsersService`) e são perdidos a cada restart da aplicação. O `JWT_SECRET` precisa estar definido no `.env`.

### Administrador (painel admin)

- `POST /auth/login` — autentica o administrador único configurado por `ADMIN_EMAIL`/`ADMIN_PASSWORD`.

## Rodando com Docker Compose (backend + Postgres)

O backend possui seu próprio [docker-compose.yml](docker-compose.yml), que sobe a API em modo desenvolvimento junto com o Postgres:

```bash
docker-compose up --build
```

- API: [http://localhost:3000](http://localhost:3000) (porta configurável via `PORT`)
- Postgres: `localhost:5432` (porta configurável via `POSTGRES_PORT`)

## Rodando o projeto completo (frontend + backend + Postgres + Nginx)

Na raiz do repositório (`TechPath/`) existe um `docker-compose.yml` que orquestra todos os serviços do projeto (frontend, backend, Postgres e Nginx).

```bash
cd ..
docker-compose up --build
```

Após subir os containers, a aplicação fica disponível via Nginx em [http://localhost](http://localhost) (porta configurável pela variável `NGINX_PORT`).
