import { randomUUID } from 'node:crypto';
import {
  BadRequestException,
  ConflictException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import * as bcrypt from 'bcryptjs';
import { LoginUserDto } from './dto/login-user.dto.js';
import { RegisterUserDto } from './dto/register-user.dto.js';
import { PublicUser, User } from './user.entity.js';

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const MIN_PASSWORD_LENGTH = 6;
const SALT_ROUNDS = 10;
// Hash "morto" usado apenas para comparar contra ele quando o e-mail não
// existe, mantendo o tempo de resposta parecido com o de um e-mail válido
// (evita vazar, por timing, se um e-mail está cadastrado ou não).
const DUMMY_PASSWORD_HASH = bcrypt.hashSync('dummy-password', SALT_ROUNDS);

/**
 * Repositório de usuários em memória.
 *
 * Não há banco de dados configurado ainda para a aplicação, então os
 * usuários cadastrados vivem apenas na memória do processo (são perdidos a
 * cada restart). Isso é suficiente para viabilizar a task de
 * cadastro/login enquanto o schema do Prisma/PostgreSQL não é definido.
 */
@Injectable()
export class UsersService {
  private readonly users: User[] = [];

  async register(dto: RegisterUserDto): Promise<PublicUser> {
    const name = dto.name?.trim();
    const email = dto.email?.trim().toLowerCase();
    const password = dto.password;

    if (!name) {
      throw new BadRequestException('O nome é obrigatório.');
    }

    if (!email || !EMAIL_REGEX.test(email)) {
      throw new BadRequestException('Informe um e-mail válido.');
    }

    if (!password || password.length < MIN_PASSWORD_LENGTH) {
      throw new BadRequestException(
        `A senha deve ter ao menos ${MIN_PASSWORD_LENGTH} caracteres.`,
      );
    }

    if (this.findByEmail(email)) {
      throw new ConflictException('Este e-mail já está cadastrado.');
    }

    const passwordHash = await bcrypt.hash(password, SALT_ROUNDS);

    const user: User = {
      id: randomUUID(),
      name,
      email,
      passwordHash,
      createdAt: new Date(),
    };

    this.users.push(user);

    return this.toPublicUser(user);
  }

  async validateCredentials(dto: LoginUserDto): Promise<PublicUser> {
    const email = dto.email?.trim().toLowerCase();
    const user = email ? this.findByEmail(email) : undefined;

    const passwordMatches = await bcrypt.compare(
      dto.password ?? '',
      user?.passwordHash ?? DUMMY_PASSWORD_HASH,
    );

    if (!user || !passwordMatches) {
      throw new UnauthorizedException('E-mail ou senha inválidos.');
    }

    return this.toPublicUser(user);
  }

  private findByEmail(email: string): User | undefined {
    return this.users.find((user) => user.email === email);
  }

  private toPublicUser(user: User): PublicUser {
    const { passwordHash: _passwordHash, ...publicUser } = user;
    return publicUser;
  }
}
