import {
  BadRequestException,
  ConflictException,
  UnauthorizedException,
} from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { UsersService } from './users.service.js';

describe('UsersService', () => {
  let usersService: UsersService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [UsersService],
    }).compile();

    usersService = module.get<UsersService>(UsersService);
  });

  describe('register', () => {
    it('creates a user and never returns the password hash', async () => {
      const user = await usersService.register({
        name: 'Gabriel',
        email: 'gabriel@example.com',
        password: 'super-secret',
      });

      expect(user).toMatchObject({
        name: 'Gabriel',
        email: 'gabriel@example.com',
      });
      expect(user).not.toHaveProperty('passwordHash');
      expect(user.id).toEqual(expect.any(String));
    });

    it('normalizes the e-mail to lower case', async () => {
      const user = await usersService.register({
        name: 'Gabriel',
        email: 'Gabriel@Example.com',
        password: 'super-secret',
      });

      expect(user.email).toBe('gabriel@example.com');
    });

    it('throws ConflictException for a duplicate e-mail', async () => {
      await usersService.register({
        name: 'Gabriel',
        email: 'gabriel@example.com',
        password: 'super-secret',
      });

      await expect(
        usersService.register({
          name: 'Outro Gabriel',
          email: 'gabriel@example.com',
          password: 'another-secret',
        }),
      ).rejects.toBeInstanceOf(ConflictException);
    });

    it('throws BadRequestException for an invalid e-mail', async () => {
      await expect(
        usersService.register({
          name: 'Gabriel',
          email: 'not-an-email',
          password: 'super-secret',
        }),
      ).rejects.toBeInstanceOf(BadRequestException);
    });

    it('throws BadRequestException for a short password', async () => {
      await expect(
        usersService.register({
          name: 'Gabriel',
          email: 'gabriel@example.com',
          password: '123',
        }),
      ).rejects.toBeInstanceOf(BadRequestException);
    });

    it('throws BadRequestException for a missing name', async () => {
      await expect(
        usersService.register({
          name: '  ',
          email: 'gabriel@example.com',
          password: 'super-secret',
        }),
      ).rejects.toBeInstanceOf(BadRequestException);
    });
  });

  describe('validateCredentials', () => {
    beforeEach(async () => {
      await usersService.register({
        name: 'Gabriel',
        email: 'gabriel@example.com',
        password: 'super-secret',
      });
    });

    it('returns the public user for correct credentials', async () => {
      const user = await usersService.validateCredentials({
        email: 'gabriel@example.com',
        password: 'super-secret',
      });

      expect(user.email).toBe('gabriel@example.com');
      expect(user).not.toHaveProperty('passwordHash');
    });

    it('is case-insensitive on the e-mail', async () => {
      const user = await usersService.validateCredentials({
        email: 'Gabriel@Example.com',
        password: 'super-secret',
      });

      expect(user.email).toBe('gabriel@example.com');
    });

    it('throws UnauthorizedException for a wrong password', async () => {
      await expect(
        usersService.validateCredentials({
          email: 'gabriel@example.com',
          password: 'wrong-password',
        }),
      ).rejects.toBeInstanceOf(UnauthorizedException);
    });

    it('throws UnauthorizedException for an unknown e-mail', async () => {
      await expect(
        usersService.validateCredentials({
          email: 'unknown@example.com',
          password: 'super-secret',
        }),
      ).rejects.toBeInstanceOf(UnauthorizedException);
    });
  });
});
