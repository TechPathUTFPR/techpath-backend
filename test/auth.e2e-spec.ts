import { INestApplication } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { Test, TestingModule } from '@nestjs/testing';
import request from 'supertest';
import { App } from 'supertest/types';
import { AppModule } from './../src/app.module.js';

const authEnvironmentKeys = [
  'ADMIN_EMAIL',
  'ADMIN_PASSWORD',
  'JWT_SECRET',
] as const;

describe('AuthController (e2e)', () => {
  let app: INestApplication<App>;
  const jwtService = new JwtService();
  const originalAuthEnvironment = new Map(
    authEnvironmentKeys.map((key) => [key, process.env[key]]),
  );

  beforeAll(async () => {
    process.env.ADMIN_EMAIL = 'test-admin@example.com';
    process.env.ADMIN_PASSWORD = 'test-password';
    process.env.JWT_SECRET = 'test-secret';

    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    await app.init();
  });

  afterAll(async () => {
    await app.close();

    for (const key of authEnvironmentKeys) {
      const value = originalAuthEnvironment.get(key);

      if (value === undefined) {
        delete process.env[key];
      } else {
        process.env[key] = value;
      }
    }
  });

  it('returns a valid access token for valid credentials', async () => {
    const response = await request(app.getHttpServer())
      .post('/auth/login')
      .send({
        email: 'test-admin@example.com',
        password: 'test-password',
      })
      .expect(201);

    expect(response.body.accessToken).toEqual(expect.any(String));
    expect(response.body.accessToken).not.toHaveLength(0);

    const payload = jwtService.verify<{ email: string }>(
      response.body.accessToken,
      { secret: 'test-secret' },
    );

    expect(payload.email).toBe('test-admin@example.com');
  });

  it('returns 401 for an incorrect password', () => {
    return request(app.getHttpServer())
      .post('/auth/login')
      .send({
        email: 'test-admin@example.com',
        password: 'incorrect-password',
      })
      .expect(401);
  });

  it('returns 401 for an incorrect email', () => {
    return request(app.getHttpServer())
      .post('/auth/login')
      .send({
        email: 'another@example.com',
        password: 'test-password',
      })
      .expect(401);
  });

  it('returns 500 when JWT_SECRET is missing', async () => {
    const jwtSecret = process.env.JWT_SECRET;
    delete process.env.JWT_SECRET;

    try {
      await request(app.getHttpServer())
        .post('/auth/login')
        .send({
          email: 'test-admin@example.com',
          password: 'test-password',
        })
        .expect(500);
    } finally {
      process.env.JWT_SECRET = jwtSecret;
    }
  });
});
