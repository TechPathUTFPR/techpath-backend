import { ExecutionContext, ForbiddenException } from '@nestjs/common';
import { AdminGuard } from './admin.guard.js';

function contextWith(user: unknown): ExecutionContext {
  return {
    switchToHttp: () => ({ getRequest: () => ({ user }) }),
  } as unknown as ExecutionContext;
}

describe('AdminGuard', () => {
  const guard = new AdminGuard();

  it('allows a token with role "admin"', () => {
    expect(guard.canActivate(contextWith({ role: 'admin' }))).toBe(true);
  });

  it.each([
    ['common user', { role: 'user' }],
    ['legacy token without role', { email: 'admin@example.com' }],
    ['no user on the request', undefined],
  ])('throws ForbiddenException for %s', (_name, user) => {
    expect(() => guard.canActivate(contextWith(user))).toThrow(
      ForbiddenException,
    );
  });
});
