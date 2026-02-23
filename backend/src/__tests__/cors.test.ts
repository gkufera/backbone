import { describe, it, expect, afterEach, vi } from 'vitest';
import request from 'supertest';

// Mock Prisma client (required because app imports routes that use prisma)
vi.mock('../lib/prisma.js', () => ({
  prisma: {},
}));

import { createApp } from '../app.js';

describe('CORS configuration', () => {
  const originalEnv = process.env.CORS_ORIGINS;

  afterEach(() => {
    if (originalEnv !== undefined) {
      process.env.CORS_ORIGINS = originalEnv;
    } else {
      delete process.env.CORS_ORIGINS;
    }
  });

  it('restricts to allowed origins when CORS_ORIGINS is set', async () => {
    process.env.CORS_ORIGINS = 'https://slugmax.com,https://staging.slugmax.com';
    const app = createApp();

    const res = await request(app)
      .get('/health')
      .set('Origin', 'https://slugmax.com');

    expect(res.headers['access-control-allow-origin']).toBe('https://slugmax.com');
  });

  it('rejects disallowed origins when CORS_ORIGINS is set', async () => {
    process.env.CORS_ORIGINS = 'https://slugmax.com';
    const app = createApp();

    const res = await request(app)
      .get('/health')
      .set('Origin', 'https://evil.com');

    expect(res.headers['access-control-allow-origin']).toBeUndefined();
  });

  it('allows any origin when CORS_ORIGINS is not set', async () => {
    delete process.env.CORS_ORIGINS;
    const app = createApp();

    const res = await request(app)
      .get('/health')
      .set('Origin', 'https://anything.com');

    expect(res.headers['access-control-allow-origin']).toBe('*');
  });
});
