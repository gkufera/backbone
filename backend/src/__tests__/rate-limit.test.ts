import { describe, it, expect } from 'vitest';
import express from 'express';
import request from 'supertest';
import { createGeneralLimiter, createAuthLimiter } from '../middleware/rate-limit.js';

function createTestApp(limiter: ReturnType<typeof createGeneralLimiter>) {
  const app = express();
  app.use(limiter);
  app.get('/test', (_req, res) => {
    res.json({ ok: true });
  });
  return app;
}

describe('Rate Limiting', () => {
  it('general limiter exposes 100/min limit header', async () => {
    const app = createTestApp(createGeneralLimiter());
    const res = await request(app).get('/test');

    expect(res.status).toBe(200);
    expect(res.headers['ratelimit-policy']).toBe('100;w=60');
  });

  it('auth limiter exposes 10/min limit header', async () => {
    const app = createTestApp(createAuthLimiter());
    const res = await request(app).get('/test');

    expect(res.status).toBe(200);
    expect(res.headers['ratelimit-policy']).toBe('10;w=60');
  });

  it('returns 429 when rate limit exceeded', async () => {
    const limiter = createGeneralLimiter({ max: 1, windowMs: 60000 });
    const app = createTestApp(limiter);

    const res1 = await request(app).get('/test');
    expect(res1.status).toBe(200);

    const res2 = await request(app).get('/test');
    expect(res2.status).toBe(429);
  });
});
