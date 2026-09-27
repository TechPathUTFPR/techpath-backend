import { Controller, Get, INestApplication, UseGuards } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { Test, TestingModule } from '@nestjs/testing';
import request from 'supertest';
import { App } from 'supertest/types';
import { AuthModule } from './../src/auth/auth.module.js';
import { JwtAuthGuard } from './../src/auth/guards/jwt-auth.guard.js';

@Controller('test/protected')
class ProtectedTestController {
  @Get()
  @UseGuards(JwtAuthGuard)
  getProtectedResource() {
    return { message: 'Protected route reached' };
  }
}

describe('JwtAuthGuard (e2e)', () => {
  let app: INestApplication<App>;
  const jwtService = new JwtService();
  const originalJwtSecret = process.env.JWT_SECRET;

  beforeAll(async () => {
    process.env.JWT_SECRET = 'test-secret';

    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AuthModule, PassportModule.register({})],
      controllers: [ProtectedTestController],
    }).compile();

    app = moduleFixture.createNestApplication();
    await app.init();
  });

  afterAll(async () => {
    await app?.close();

    if (originalJwtSecret === undefined) {
      delete process.env.JWT_SECRET;
    } else {
      process.env.JWT_SECRET = originalJwtSecret;
    }
  });

  it('returns 401 when Authorization is missing', () => {
    return request(app.getHttpServer()).get('/test/protected').expect(401);
  });

  it('returns 401 for an invalid bearer token', () => {
    return request(app.getHttpServer())
      .get('/test/protected')
      .set('Authorization', 'Bearer invalid-token')
      .expect(401);
  });

  it('returns 401 for an expired bearer token', () => {
    const expiredToken = jwtService.sign(
      { email: 'test-admin@example.com' },
      { secret: 'test-secret', expiresIn: -1 },
    );

    return request(app.getHttpServer())
      .get('/test/protected')
      .set('Authorization', `Bearer ${expiredToken}`)
      .expect(401);
  });

  it('allows access to the protected controller for a valid bearer token', async () => {
    const validToken = jwtService.sign(
      { email: 'test-admin@example.com' },
      { secret: 'test-secret' },
    );

    const response = await request(app.getHttpServer())
      .get('/test/protected')
      .set('Authorization', `Bearer ${validToken}`)
      .expect(200);

    expect(response.body).toEqual({ message: 'Protected route reached' });
  });
});
