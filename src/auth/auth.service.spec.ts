import {
  InternalServerErrorException,
  UnauthorizedException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { Test, TestingModule } from '@nestjs/testing';
import { AuthService } from './auth.service.js';

const authEnvironmentKeys = [
  'ADMIN_EMAIL',
  'ADMIN_PASSWORD',
  'JWT_SECRET',
] as const;

describe('AuthService', () => {
  let authService: AuthService;
  const jwtService = {
    signAsync: vi.fn(),
  };
  const originalAuthEnvironment = new Map(
    authEnvironmentKeys.map((key) => [key, process.env[key]]),
  );

  beforeEach(async () => {
    process.env.ADMIN_EMAIL = 'admin@example.com';
    process.env.ADMIN_PASSWORD = 'test-password';
    process.env.JWT_SECRET = 'test-secret';

    jwtService.signAsync.mockReset();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthService,
        {
          provide: JwtService,
          useValue: jwtService,
        },
      ],
    }).compile();

    authService = module.get<AuthService>(AuthService);
  });

  afterEach(() => {
    for (const key of authEnvironmentKeys) {
      const value = originalAuthEnvironment.get(key);

      if (value === undefined) {
        delete process.env[key];
      } else {
        process.env[key] = value;
      }
    }
  });

  describe('login', () => {
    it('generates an access token for valid credentials', async () => {
      jwtService.signAsync.mockResolvedValue('access-token');

      await expect(
        authService.login({
          email: 'admin@example.com',
          password: 'test-password',
        }),
      ).resolves.toEqual({ accessToken: 'access-token' });

      expect(jwtService.signAsync).toHaveBeenCalledWith(
        { email: 'admin@example.com' },
        { secret: 'test-secret' },
      );
    });

    it('throws UnauthorizedException for an incorrect password', async () => {
      await expect(
        authService.login({
          email: 'admin@example.com',
          password: 'incorrect-password',
        }),
      ).rejects.toBeInstanceOf(UnauthorizedException);

      expect(jwtService.signAsync).not.toHaveBeenCalled();
    });

    it('throws UnauthorizedException for an incorrect email', async () => {
      await expect(
        authService.login({
          email: 'another@example.com',
          password: 'test-password',
        }),
      ).rejects.toBeInstanceOf(UnauthorizedException);

      expect(jwtService.signAsync).not.toHaveBeenCalled();
    });

    it.each(authEnvironmentKeys)(
      'throws InternalServerErrorException when %s is missing',
      async (environmentKey) => {
        delete process.env[environmentKey];

        await expect(
          authService.login({
            email: 'admin@example.com',
            password: 'test-password',
          }),
        ).rejects.toBeInstanceOf(InternalServerErrorException);

        expect(jwtService.signAsync).not.toHaveBeenCalled();
      },
    );
  });
});
