# TechPath Backend

API backend do TechPath, construída com [NestJS](https://nestjs.com).

## Tecnologias

- NestJS 12
- TypeScript
- PostgreSQL + [Prisma ORM 7](https://www.prisma.io) (driver adapter `@prisma/adapter-pg`)
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

# Usada pelo Prisma ao rodar a API fora do Docker
DATABASE_URL=postgres://techpath:techpath@localhost:5432/techpath

# Autenticação do administrador
JWT_SECRET=troque_por_um_segredo
ADMIN_EMAIL=admin@example.com
ADMIN_PASSWORD=troque_esta_senha
```

No Docker Compose a `DATABASE_URL` é montada automaticamente (aponta para o serviço `postgres`).

## Banco de dados (Prisma)

O schema fica em [prisma/schema.prisma](prisma/schema.prisma) (9 tabelas) e a conexão em [prisma.config.ts](prisma.config.ts).

**Com Docker Compose** (`docker-compose up --build`) as tabelas são criadas automaticamente: o container gera o Prisma Client, executa `prisma db push` e só depois inicia a API.

**Sem Docker**, com o Postgres no ar e a `DATABASE_URL` definida:

```bash
npm run db:setup   # prisma generate + prisma db push (cria as tabelas)
```

| Comando | Descrição |
| --- | --- |
| `npm run prisma:generate` | Gera o Prisma Client em `src/generated/prisma` (ignorado pelo git) |
| `npm run db:push` | Cria/atualiza as tabelas a partir do schema |
| `npm run db:setup` | `prisma:generate` + `db:push` |

## E-mail (SMTP)

O módulo `src/mail` envia e-mails via SMTP com [nodemailer](https://nodemailer.com). Ele só cuida do **envio** (validação, retentativas, erros); o conteúdo (assunto, texto/HTML) é definido por quem chama.

```ts
constructor(private readonly mail: MailService) {}

await this.mail.send({
  to: 'usuario@example.com',
  subject: 'Seu resultado do TechPath',
  text: 'Olá!',          // ou html: '<p>Olá!</p>'
  attachments: [{ filename: 'resultado.pdf', content: pdfBuffer }],
});
```

O `MailModule` é global, então basta injetar o `MailService`. Erros possíveis: `MailValidationError` (pedido inválido, nada enviado), `MailDeliveryError` (o SMTP falhou; `transient` diz se vale tentar de novo), `MailNotConfiguredError` (sem `SMTP_HOST`).

| Variável | Obrigatória | Padrão | Descrição |
| --- | --- | --- | --- |
| `SMTP_HOST` | não* | — | Sem ela o envio fica desativado (a API sobe normalmente) |
| `MAIL_FROM` | sim, se há host | — | Remetente: `email@x.com` ou `Nome <email@x.com>` |
| `SMTP_PORT` | não | 587 | |
| `SMTP_SECURE` | não | `true` só na 465 | TLS direto |
| `SMTP_REQUIRE_TLS` | não | false | Exige STARTTLS (recomendado em produção) |
| `SMTP_USER` / `SMTP_PASS` | não | — | Devem ser informados juntos |
| `SMTP_TLS_REJECT_UNAUTHORIZED` | não | true | Só desligue em testes locais |
| `SMTP_TIMEOUT_MS` | não | 10000 | Conexão, saudação e socket |
| `MAIL_MAX_RETRIES` / `MAIL_RETRY_DELAY_MS` | não | 2 / 500 | Retentativas só para falhas transitórias (backoff dobra a cada vez) |

**Testar na prática:** `docker-compose up` sobe o [Mailpit](https://mailpit.axllent.org), um SMTP falso. Os e-mails enviados aparecem em http://localhost:8025.

**Testes automatizados:** `npm test` (unitários do serviço e da config) e `npm run test:e2e` (inclui `test/mail.e2e-spec.ts`, que sobe um servidor SMTP em memória).

## Como rodar localmente

1. Instalar as dependências:

```bash
npm install
```

2. Ter um Postgres disponível (local ou via `docker-compose up postgres`) e configurar a `DATABASE_URL`.

3. Criar as tabelas e gerar o client:

```bash
npm run db:setup
```

4. Rodar em modo desenvolvimento (watch):

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
