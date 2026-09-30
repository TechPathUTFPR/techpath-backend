import { INestApplication } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { Test, TestingModule } from '@nestjs/testing';
import request from 'supertest';
import { App } from 'supertest/types';
import { AppModule } from './../src/app.module.js';

describe('UsersController (e2e)', () => {
  let app: INestApplication<App>;
  const jwtService = new JwtService();
  const originalJwtSecret = process.env.JWT_SECRET;

  beforeAll(async () => {
    process.env.JWT_SECRET = 'test-secret';

    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    await app.init();
  });

  afterAll(async () => {
    await app.close();

    if (originalJwtSecret === undefined) {
      delete process.env.JWT_SECRET;
    } else {
      process.env.JWT_SECRET = originalJwtSecret;
    }
  });

  describe('/users/register (POST)', () => {
    it('registers a new user and returns an access token', async () => {
      const response = await request(app.getHttpServer())
        .post('/users/register')
        .send({
          name: 'Gabriel',
          email: 'gabriel.e2e@example.com',
          password: 'super-secret',
        })
        .expect(201);

      expect(response.body.accessToken).toEqual(expect.any(String));
      expect(response.body.user).toMatchObject({
        name: 'Gabriel',
        email: 'gabriel.e2e@example.com',
      });
      expect(response.body.user).not.toHaveProperty('passwordHash');

      const payload = jwtService.verify<{ email: string; role: string }>(
        response.body.accessToken,
        { secret: 'test-secret' },
      );

      expect(payload.email).toBe('gabriel.e2e@example.com');
      expect(payload.role).toBe('user');
    });

    it('returns 409 for a duplicate e-mail', async () => {
      await request(app.getHttpServer())
        .post('/users/register')
        .send({
          name: 'Gabriel',
          email: 'duplicado@example.com',
          password: 'super-secret',
        })
        .expect(201);

      await request(app.getHttpServer())
        .post('/users/register')
        .send({
          name: 'Outro Usuário',
          email: 'duplicado@example.com',
          password: 'another-secret',
        })
        .expect(409);
    });

    it('returns 400 for an invalid payload', () => {
      return request(app.getHttpServer())
        .post('/users/register')
        .send({
          name: '',
          email: 'not-an-email',
          password: '123',
        })
        .expect(400);
    });
  });

  describe('/users/login (POST)', () => {
    beforeAll(async () => {
      await request(app.getHttpServer()).post('/users/register').send({
        name: 'Login Teste',
        email: 'login.e2e@example.com',
        password: 'super-secret',
      });
    });

    it('returns an access token for valid credentials', async () => {
      const response = await request(app.getHttpServer())
        .post('/users/login')
        .send({
          email: 'login.e2e@example.com',
          password: 'super-secret',
        })
        .expect(200);

      expect(response.body.accessToken).toEqual(expect.any(String));
      expect(response.body.user.email).toBe('login.e2e@example.com');
    });

    it('returns 401 for an incorrect password', () => {
      return request(app.getHttpServer())
        .post('/users/login')
        .send({
          email: 'login.e2e@example.com',
          password: 'wrong-password',
        })
        .expect(401);
    });

    it('returns 401 for an unknown e-mail', () => {
      return request(app.getHttpServer())
        .post('/users/login')
        .send({
          email: 'unknown.e2e@example.com',
          password: 'super-secret',
        })
        .expect(401);
    });
  });
});
