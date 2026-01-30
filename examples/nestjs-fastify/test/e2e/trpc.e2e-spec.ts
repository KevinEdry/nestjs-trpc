import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import {
  FastifyAdapter,
  NestFastifyApplication,
} from '@nestjs/platform-fastify';
import request from 'supertest';
import { AppModule } from '../../src/app.module';

describe('tRPC Integration (e2e)', () => {
  let app: INestApplication;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication<NestFastifyApplication>(
      new FastifyAdapter(),
    );
    await app.init();
    await app.getHttpAdapter().getInstance().ready();
  });

  afterAll(async () => {
    if (app) {
      await app.close();
    }
  });

  describe('users router', () => {
    it('GET /trpc/users.getUserById should return user data', async () => {
      const input = JSON.stringify({ userId: '1' });
      const response = await request(app.getHttpServer())
        .get(`/trpc/users.getUserById?input=${encodeURIComponent(input)}`)
        .expect(200);

      expect(response.body).toHaveProperty('result');
      expect(response.body.result).toHaveProperty('data');
      expect(response.body.result.data).toHaveProperty('name');
      expect(response.body.result.data).toHaveProperty('email');
    });

    it('GET /trpc/users.getUserById with different userId should return user data', async () => {
      const input = JSON.stringify({ userId: 'test-user-123' });
      const response = await request(app.getHttpServer())
        .get(`/trpc/users.getUserById?input=${encodeURIComponent(input)}`)
        .expect(200);

      expect(response.body).toHaveProperty('result');
      expect(response.body.result).toHaveProperty('data');
    });

    it('GET /trpc/users.getUserById without input should return error', async () => {
      const response = await request(app.getHttpServer())
        .get('/trpc/users.getUserById')
        .expect(400);

      expect(response.body).toHaveProperty('error');
    });
  });
});
