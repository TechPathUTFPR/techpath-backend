import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
} from '@nestjs/common';

/**
 * Libera a rota apenas para administradores.
 *
 * Deve ser usado DEPOIS do JwtAuthGuard (que valida o token e preenche
 * `request.user` com o payload):
 *
 *   @UseGuards(JwtAuthGuard, AdminGuard)
 *
 * Token ausente/inválido => 401 (JwtAuthGuard). Token válido de usuário
 * comum => 403 (este guard).
 */
@Injectable()
export class AdminGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const request = context
      .switchToHttp()
      .getRequest<{ user?: { role?: string } }>();

    if (request.user?.role !== 'admin') {
      throw new ForbiddenException('Acesso restrito a administradores.');
    }

    return true;
  }
}
