import { describe, it, expect, beforeEach, vi } from 'vitest';
import request from 'supertest';
import express from 'express';
import { requireAuth, type AuthenticatedRequest } from '../middleware/auth';
import { signToken } from '../lib/jwt';

// Mock Prisma client
vi.mock('../lib/prisma', () => ({
  prisma: {
    user: {
      findUnique: vi.fn(),
    },
  },
}));

import { prisma } from '../lib/prisma';
const mockedPrisma = vi.mocked(prisma);

function createTestApp() {
  const app = express();
  app.use(express.json());

  app.get('/protected', requireAuth, (req, res) => {
    const authReq = req as AuthenticatedRequest;
    res.json({ userId: authReq.user.userId, email: authReq.user.email });
  });

  return app;
}

describe('requireAuth tokenVersion check', () => {
  let testApp: express.Express;

  beforeEach(() => {
    vi.clearAllMocks();
    testApp = createTestApp();
  });

  it('accepts request when JWT tokenVersion matches DB tokenVersion', async () => {
    const token = signToken({
      userId: 'user-1',
      email: 'test@example.com',
      tokenVersion: 0,
    });

    mockedPrisma.user.findUnique.mockResolvedValue({
      id: 'user-1',
      tokenVersion: 0,
    } as any);

    const res = await request(testApp)
      .get('/protected')
      .set('Authorization', `Bearer ${token}`);

    expect(res.status).toBe(200);
    expect(res.body.userId).toBe('user-1');
  });

  it('rejects request when JWT tokenVersion does not match DB', async () => {
    const token = signToken({
      userId: 'user-1',
      email: 'test@example.com',
      tokenVersion: 0,
    });

    mockedPrisma.user.findUnique.mockResolvedValue({
      id: 'user-1',
      tokenVersion: 1,
    } as any);

    const res = await request(testApp)
      .get('/protected')
      .set('Authorization', `Bearer ${token}`);

    expect(res.status).toBe(401);
    expect(res.body.error).toMatch(/token/i);
  });

  it('rejects request when user not found in DB', async () => {
    const token = signToken({
      userId: 'deleted-user',
      email: 'test@example.com',
      tokenVersion: 0,
    });

    mockedPrisma.user.findUnique.mockResolvedValue(null);

    const res = await request(testApp)
      .get('/protected')
      .set('Authorization', `Bearer ${token}`);

    expect(res.status).toBe(401);
    expect(res.body.error).toMatch(/token/i);
  });
});
