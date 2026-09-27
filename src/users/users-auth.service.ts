import { Injectable, InternalServerErrorException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { PublicUser } from './user.entity.js';

interface UserJwtPayload {
  sub: string;
  email: string;
  role: 'user';
}

/**
 * Responsável por emitir o access token JWT de um usuário autenticado
 * (cadastro ou login). Mantido separado do UsersService para não misturar
 * a persistência (mocada) com a emissão de token.
 */
@Injectable()
export class UsersAuthService {
  constructor(private readonly jwtService: JwtService) {}

  async signToken(user: PublicUser): Promise<string> {
    const jwtSecret = process.env.JWT_SECRET;

    if (!jwtSecret) {
      throw new InternalServerErrorException(
        'User authentication is not configured.',
      );
    }

    const payload: UserJwtPayload = {
      sub: user.id,
      email: user.email,
      role: 'user',
    };

    return this.jwtService.signAsync(payload, { secret: jwtSecret });
  }
}
