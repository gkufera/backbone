import { describe, it, expect, vi } from 'vitest';
import request from 'supertest';

// Mock Prisma client (required because app imports routes that use prisma)
vi.mock('../lib/prisma', () => ({
  prisma: {},
}));

import { app } from '../app';

describe('GET /health', () => {
  it('returns 200 with status ok', async () => {
    const res = await request(app).get('/health');

    expect(res.status).toBe(200);
    expect(res.body).toMatchObject({ status: 'ok' });
    expect(res.body).toHaveProperty('timestamp');
    expect(res.body).toHaveProperty('uptime');
  });
});
