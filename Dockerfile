ARG NODE_VERSION=22-alpine

FROM node:${NODE_VERSION} AS base
WORKDIR /usr/src/app
# O Prisma precisa do OpenSSL no Alpine
RUN apk add --no-cache openssl

FROM base AS dependencies
COPY package.json package-lock.json ./
RUN npm ci

# Desenvolvimento: gera o Prisma Client, cria/atualiza as tabelas no Postgres
# e só então inicia a API em modo watch.
FROM base AS dev
ENV NODE_ENV=development
COPY --from=dependencies /usr/src/app/node_modules ./node_modules
COPY . .
EXPOSE 3000
CMD ["sh", "-c", "npx prisma generate && npx prisma db push && npm run start:dev"]

FROM base AS build
COPY --from=dependencies /usr/src/app/node_modules ./node_modules
COPY . .
# "npm run build" já executa "prisma generate" (script prebuild)
RUN npm run build

FROM base AS prod-dependencies
COPY package.json package-lock.json ./
RUN npm ci --omit=dev

# Produção: aplica o schema no banco antes de iniciar a API.
FROM base AS production
ENV NODE_ENV=production
COPY --from=prod-dependencies /usr/src/app/node_modules ./node_modules
COPY --from=build /usr/src/app/dist ./dist
COPY package.json prisma.config.ts ./
COPY prisma ./prisma

RUN addgroup -S nodejs && adduser -S nestjs -G nodejs
USER nestjs

EXPOSE 3000
CMD ["sh", "-c", "npx prisma db push && node dist/main"]
