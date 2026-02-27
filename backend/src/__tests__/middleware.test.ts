import { describe, it, expect, beforeEach, vi } from 'vitest';
import request from 'supertest';
import express from 'express';
import { requireAuth, type AuthenticatedRequest } from '../middleware/auth';
import { signToken } from '../lib/jwt';
import { prisma } from '../lib/prisma';

vi.mock('../lib/prisma', () => ({
  prisma: {
    user: {
      findUnique: vi.fn(),
    },
  },
}));

const mockedPrisma = vi.mocked(prisma);

// Create a test app with a protected route
function createTestApp() {
  const testApp = express();
  testApp.use(express.json());

  testApp.get('/protected', requireAuth, (req, res) => {
    const authReq = req as AuthenticatedRequest;
    res.json({ userId: authReq.user.userId, email: authReq.user.email });
  });

  return testApp;
}

describe('requireAuth middleware', () => {
  let testApp: express.Express;

  beforeEach(() => {
    testApp = createTestApp();
    vi.clearAllMocks();
    // Default: user exists with tokenVersion 0, verified email (matches signToken default)
    mockedPrisma.user.findUnique.mockResolvedValue({
      id: 'test-user-id',
      tokenVersion: 0,
      emailVerified: true,
    } as any);
  });

  it('rejects requests with no Authorization header', async () => {
    const res = await request(testApp).get('/protected');

    expect(res.status).toBe(401);
    expect(res.body).toHaveProperty('error');
    expect(res.body.error).toMatch(/token/i);
  });

  it('rejects requests with invalid token format', async () => {
    const res = await request(testApp)
      .get('/protected')
      .set('Authorization', 'NotBearer some-token');

    expect(res.status).toBe(401);
    expect(res.body).toHaveProperty('error');
  });

  it('rejects requests with expired or invalid JWT', async () => {
    const res = await request(testApp)
      .get('/protected')
      .set('Authorization', 'Bearer invalid-jwt-token');

    expect(res.status).toBe(401);
    expect(res.body).toHaveProperty('error');
  });

  it('allows requests with valid JWT and attaches user to request', async () => {
    mockedPrisma.user.findUnique.mockResolvedValue({
      id: 'test-user-id',
      tokenVersion: 0,
      emailVerified: true,
    } as any);

    const token = signToken({
      userId: 'test-user-id',
      email: 'test@example.com',
    });

    const res = await request(testApp).get('/protected').set('Authorization', `Bearer ${token}`);

    expect(res.status).toBe(200);
    expect(res.body.userId).toBe('test-user-id');
    expect(res.body.email).toBe('test@example.com');
  });

  it('rejects requests from users with unverified email', async () => {
    mockedPrisma.user.findUnique.mockResolvedValue({
      id: 'test-user-id',
      tokenVersion: 0,
      emailVerified: false,
    } as any);

    const token = signToken({
      userId: 'test-user-id',
      email: 'test@example.com',
    });

    const res = await request(testApp).get('/protected').set('Authorization', `Bearer ${token}`);

    expect(res.status).toBe(403);
    expect(res.body.error).toMatch(/email.*verif/i);
  });
});
