/**
 * Representa um usuário (estudante/profissional) que pode se cadastrar e
 * fazer login para responder o questionário.
 *
 * Enquanto não existe banco de dados, os usuários são mantidos em memória
 * pelo UsersService (ver `users.service.ts`). Quando o Prisma/PostgreSQL
 * forem integrados (conforme a OneSpec), esta interface deve virar o
 * modelo do Prisma e o UsersService deve trocar o array em memória por
 * chamadas ao repositório real, mantendo a mesma API pública.
 */
export interface User {
  id: string;
  name: string;
  email: string;
  passwordHash: string;
  createdAt: Date;
}

/** Dados do usuário seguros para retornar na API (sem o hash da senha). */
export type PublicUser = Omit<User, 'passwordHash'>;
