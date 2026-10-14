import 'dotenv/config';
import { defineConfig } from 'prisma/config';

export default defineConfig({
  schema: 'prisma/schema.prisma',
  migrations: {
    path: 'prisma/migrations',
  },
  datasource: {
    // Lida do ambiente (.env localmente; variável do container no Docker).
    url: process.env.DATABASE_URL,
  },
});
